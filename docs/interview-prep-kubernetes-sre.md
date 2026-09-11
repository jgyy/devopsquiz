# Interview prep: Kubernetes operators, messaging, observability, incidents

The quiz bank covers the factual side of these topics (see the `crd`, `operators`,
`troubleshooting`, `sqs`, `redis`, `autoscaling`, `fluentd`, `apm`, `percentiles` and
`incident-response` tags). This sheet is for the open-ended, CV-driven questions that
cannot be multiple choice. Fill in the blanks with your own projects before the interview.

## Story questions: prepare one concrete example each

Use the same shape for every story: **context, problem, what you did, result, what you would
do differently**. Aim for two minutes spoken, with numbers where you have them.

1. **"What was your most complex project and why was it complex?"**
   Complexity should come from constraints, not size: conflicting requirements, migration
   with zero downtime, unclear ownership, tight latency budget, many moving parts (queue,
   cache, operator, autoscaling) that had to fail safely together.

2. **"Tell us about a Kubernetes infrastructure incident you personally handled."**
   Pick one where you can walk the detection, diagnosis and fix, for example: nodes going
   `NotReady` after a certificate or CNI issue, pods evicted under `DiskPressure`, an
   operator stuck on finalizers blocking namespace deletion, a bad HPA target causing a
   scale storm, CoreDNS overload, or an API removal breaking a cluster upgrade.
   Say what the first signal was, how you narrowed the layer, what you rolled back or
   changed, and what alert or runbook you added afterwards.

3. **"How did you use Redis?"** cache-aside with TTLs, session store, rate limiting, locks.
   Be ready for: eviction policy, what happens on failover (cold cache, stampede), cluster
   mode vs replicas, and why it was not the source of truth.

4. **"How did you use SQS / Pub/Sub?"** decoupling producers from workers, visibility
   timeout vs ack deadline, dead-letter queue with `maxReceiveCount`, idempotent consumers,
   fan-out via SNS or one subscription per consumer, scaling workers on backlog per instance
   (or KEDA on Kubernetes).

5. **"How did you use Fluentd?"** DaemonSet per node, tail with position file, kubernetes
   metadata filter, tag-based routing to different outputs, file buffers and retry settings
   so a backend outage does not lose logs, and what you alerted on (buffer queue, retries).

6. **"How did autoscaling work?"** Describe both layers: HPA (or KEDA) on pods, Cluster
   Autoscaler or Karpenter on nodes, or ASG target tracking on EC2. Mention warmup and
   cooldown, PodDisruptionBudgets during scale-in, and the metric you chose and why.

7. **"How did you write incident response?"** They mean the plan, not the report: severity
   definitions, roles (incident commander, comms), escalation, channels, runbook links,
   resolution criteria, and the postmortem trigger. Say how you rehearsed it.

8. **"What were your p99 requirements and how did you meet them?"** Give the number, where
   it was measured (edge or service), how it was computed (histograms, not averaged
   percentiles), and what you changed to hit it (caching, connection pooling, timeouts,
   right-sizing).

9. **"Which APM tools did you use?"** Name them, then explain trace propagation across
   services and queues, and one bug the traces found that logs alone would not have.

10. **"How do you identify a down issue?"** Synthetic checks from outside first, then walk
    the path: DNS, certificate, load balancer target health, ingress, endpoints and readiness,
    recent deploys. Correlate with change history before restarting anything.

11. **"What did you do at your earlier company?"** Two or three sentences per role, each
    tied to something on the CV they can ask about.

## Kubernetes operator and troubleshooting questions: full answers

Each answer is written the way you would say it: a one-sentence headline, then the mechanism,
then a detail that shows you have done it. Practise saying the headline first.

### 1. What is the difference between a Custom Resource and a Custom Resource Definition?

A CRD is the schema; a CR is an instance of it. The CRD is itself a Kubernetes object
(`apiextensions.k8s.io/v1`) that tells the API server "there is now a kind called `Database`
in group `db.example.com` with versions `v1alpha1` and `v1`, and here is the OpenAPI schema".
Once it is applied, the API server registers a new REST endpoint and starts validating and
storing objects of that kind. A CR is one of those objects: `kind: Database`, `name: orders`,
with a `spec`. Analogy: the CRD is like a table definition, the CR is a row. The CRD alone
does nothing; a controller is what gives the CR behaviour.

### 2. When a Custom Resource is submitted through the Kubernetes API, where is it stored?

In etcd, via the API server, exactly like a built-in resource. The API server serialises it
(Protobuf for built-ins, JSON for CRs) and writes it under a key like
`/registry/db.example.com/databases/<namespace>/<name>`. Nothing else stores it: controllers
keep an in-memory cache, but etcd is the only source of truth. That is why etcd size and
object count matter when a CRD is used at scale, and why very large `status` blocks are a
bad idea.

### 3. What happens after a Custom Resource is stored in etcd?

The write completes and the API server returns to the client. Anyone with a watch on that
resource type gets an ADDED or MODIFIED event over the watch stream. In practice that is the
operator's informer: it updates its local cache, runs the event handler, and enqueues the
object's namespace/name key onto a rate-limited work queue. A worker goroutine pops the key
and calls `Reconcile`. Reconcile reads the CR from the cache, compares desired state to what
exists, creates or updates children (Deployments, Services, Secrets), writes `status`, and
returns. If the controller is not running, nothing happens: the CR just sits in etcd.

### 4. What happens internally after you run `kubectl apply`?

1. kubectl reads the manifest and decides the strategy: client-side apply computes a
   three-way merge patch using the `last-applied-configuration` annotation; server-side
   apply (`--server-side`) sends the full object with a field manager and lets the API server
   merge and track ownership per field.
2. The request hits the API server: authentication (client cert, token, OIDC), then
   authorization (RBAC: can this identity `patch` this resource in this namespace).
3. Admission: mutating webhooks and plugins run first (defaults, sidecar injection), then
   schema validation against the OpenAPI spec, then validating webhooks and policies
   (Gatekeeper, Kyverno, ValidatingAdmissionPolicy).
4. The object is written to etcd with a new `resourceVersion`.
5. Watchers fire. For a Deployment, the Deployment controller creates or scales a ReplicaSet,
   the ReplicaSet controller creates Pods, the scheduler binds them to nodes, and kubelet on
   each node pulls images and starts containers, reporting back via `status`.

`kubectl apply` returns after step 4. Everything after is asynchronous, which is why you
`rollout status` to know whether it actually worked.

### 5. How does a Kubernetes controller or operator work?

A controller is a loop that watches one or more resource types and drives the cluster toward
the desired state in `spec`. An operator is a controller that encodes domain knowledge for a
specific application, usually via a CRD. Structure of a controller-runtime operator:

- A manager that owns a shared cache and client, leader election, metrics and health endpoints.
- Informers that watch the CR and any owned resources and keep a cache in sync.
- A work queue with rate limiting and deduplication, keyed by namespace/name.
- A `Reconcile(ctx, req)` function that reads the current state and converges it.

The operator part is the domain logic: for a database operator, reconcile means "ensure a
StatefulSet exists, ensure a Secret with credentials exists, run schema migrations when the
version changes, take a backup before upgrade, update `status.phase`". Operators replace the
runbook a human would follow.

### 6. What is a Kubernetes reconciliation loop?

It is the pattern of repeatedly observing the actual state, comparing it to the desired
state, and taking one step toward closing the gap. It is level-triggered, not edge-triggered:
reconcile does not receive "what changed", it receives "this object may need attention" and
re-reads everything. That makes it robust to missed events, restarts and out-of-order
delivery. A good reconcile is short, makes at most a few changes, and returns; the next
event or requeue triggers another pass. Periodic resync (every ten hours by default in
controller-runtime) re-enqueues everything as a safety net.

### 7. What is the difference between `spec` and `status`?

`spec` is desired state written by the user or a higher-level controller. `status` is
observed state written by the controller. Users should never edit `status`, controllers
should never edit `spec`. Kubernetes enforces this with the `/status` subresource: when it
is enabled on a CRD, a normal PUT ignores `status` changes and a PUT to `/status` ignores
`spec` changes, and the two can have separate RBAC. Good status contains `conditions`
(`Ready`, `Progressing`, with reason, message and timestamps) and `observedGeneration`, so
a client can tell whether the controller has seen the latest spec yet.

### 8. How does an operator detect that a Custom Resource has been created or updated?

Through a watch. The informer opens a long-lived HTTP watch on the resource type starting
from a `resourceVersion`; the API server streams ADDED, MODIFIED and DELETED events. On
startup the informer does a LIST to build the cache, then WATCHes for changes. Every event
goes through the handler which enqueues the key. The operator also watches the resources it
owns (with `Owns()` in controller-runtime) so that if someone deletes the child Deployment,
the parent CR is re-enqueued and the Deployment is recreated. If the watch connection drops,
the informer re-lists and resumes, so events are not lost.

### 9. Why must a Kubernetes controller be idempotent?

Because the same key will be reconciled many times for the same state: after informer resync,
after a controller restart, after a leader election change, when an owned resource changes,
and when an earlier reconcile returned an error and was retried. If reconcile created a new
Job every time it ran, you would get hundreds of Jobs. Idempotent means "check, then act only
if needed": get the child, create it only if it does not exist, update it only if its spec
differs, use deterministic names, and use `CreateOrUpdate` or server-side apply rather than
blind creates.

### 10. What is a Kubernetes finalizer?

A finalizer is a string in `metadata.finalizers` that blocks actual deletion until it is
removed. When a user deletes an object that has finalizers, the API server only sets
`deletionTimestamp`; the object stays readable. The controller sees the timestamp, runs
cleanup (delete the cloud load balancer, drop the external DNS record, snapshot the
database), then removes its finalizer with a patch. When the list is empty the API server
deletes the object for real. Common pain: an operator is uninstalled while its CRs still
carry finalizers, so `kubectl delete` hangs forever and the namespace sticks in
`Terminating`. The fix is to reinstall the operator or, as a last resort, patch the
finalizer away by hand.

### 11. What is the difference between an ownerReference and a finalizer?

They solve opposite problems. An `ownerReference` says "this object belongs to that one" and
lets the garbage collector delete children automatically when the parent goes away
(background, foreground or orphan propagation). It is for in-cluster resources. A finalizer
says "do not delete this object until I have cleaned up" and is for things the garbage
collector cannot see: external resources, or ordered teardown. An operator typically uses
both: ownerReferences on the Deployment and Service it creates so they vanish with the CR,
and a finalizer on the CR to remove the S3 bucket or IAM role before that happens.

### 12. How would you build a Kubernetes operator in Golang?

Scaffold with Kubebuilder (or Operator SDK, which wraps it):

```
kubebuilder init --domain example.com --repo github.com/acme/db-operator
kubebuilder create api --group db --version v1alpha1 --kind Database
```

Then:

- Define the Go types in `api/v1alpha1/database_types.go` with `Spec` and `Status` structs and
  kubebuilder markers for validation, defaults, printer columns and the status subresource.
  `make manifests` runs `controller-gen` to produce the CRD YAML, RBAC and deepcopy code.
- Implement `Reconcile` in `controllers/database_controller.go`: fetch the CR, handle
  deletion via finalizer, build the desired child objects, `CreateOrUpdate` each with
  `SetControllerReference`, update `status.conditions`, return `ctrl.Result{}` or an error.
- In `SetupWithManager`, `For(&Database{}).Owns(&appsv1.StatefulSet{}).Owns(&corev1.Secret{})`.
- Write tests with envtest (a real API server and etcd, no kubelet) and Ginkgo.
- Build a distroless multi-arch image, deploy with the generated Kustomize or a Helm chart,
  enable leader election for multiple replicas, and expose `/metrics` for Prometheus.

Mention the gotchas you hit: status updates conflicting on `resourceVersion` (use a retry or
`Patch`), watching Secrets across the whole cluster blowing up memory (use field selectors or
label-restricted caches), and forgetting to requeue after an external call.

### 13. What RBAC permissions does a Kubernetes operator require?

Minimum for the operator's ServiceAccount, usually as a ClusterRole if the CR is
cluster-scoped or used in many namespaces, otherwise a Role per namespace:

- On the CR: `get, list, watch, update, patch` (create and delete usually not needed).
- On `<cr>/status`: `get, update, patch`.
- On `<cr>/finalizers`: `update` (needed on clusters with OwnerReferencesPermissionEnforcement).
- On every owned kind (Deployments, StatefulSets, Services, Secrets, ConfigMaps, PVCs):
  `get, list, watch, create, update, patch, delete`.
- On `events`: `create, patch` for `kubectl describe` output.
- On `coordination.k8s.io/leases`: `get, create, update` for leader election.

Kubebuilder generates these from `+kubebuilder:rbac` markers so the code and the manifest
cannot drift. Never give the operator `cluster-admin`; treat it as a workload identity, and
on EKS give it an IAM role via IRSA or Pod Identity for cloud API calls.

### 14. How would you handle failures, retries and requeuing within a Kubernetes operator?

Three tools in the return value of `Reconcile`:

- Return an error: the work queue re-enqueues with exponential backoff (5 ms up to about
  16 minutes by default) and increments the `controller_runtime_reconcile_errors_total`
  metric. Use for transient failures such as API conflicts or a cloud timeout.
- Return `Result{RequeueAfter: 30 * time.Second}` with no error: a planned wait, for
  example polling until an RDS instance becomes available. Do not sleep inside reconcile.
- Return `Result{}`: done, wait for the next event.

Design rules: never block the reconcile loop; keep operations idempotent so retries are
safe; record the failure in a `status.condition` and an Event so users can see it; make
external calls with a context timeout; and distinguish permanent errors (invalid spec) from
transient ones so you stop retrying a config that can never work. Set `MaxConcurrentReconciles`
so one slow object does not starve others.

### 15. How would you manage different versions of a CRD?

A CRD can serve several versions at once (`v1alpha1`, `v1beta1`, `v1`) but exactly one is
the storage version. Steps for evolving:

1. Add the new version with `served: true`, keep the old one served too.
2. If the schemas differ in shape, deploy a conversion webhook (`strategy: Webhook`); if only
   fields were added, `strategy: None` is fine and the API server just round-trips.
3. Switch `storage: true` to the new version. Existing objects stay stored in the old
   version until they are rewritten, so run a storage migration (read and write every
   object, or use the `kube-storage-version-migrator`).
4. Mark the old version `deprecated: true` with a warning message, later `served: false`,
   and finally remove it from `status.storedVersions` and the CRD.

In the operator, reconcile on the hub version only; the webhook converts. Test conversions
in both directions. Keep additive changes as the default: new optional fields with defaults
are far cheaper than a new version.

### 16. How would you troubleshoot a pod that remains in a Pending state?

Pending means the scheduler has not bound the pod to a node, or kubelet has not started it.
Start with `kubectl describe pod` and read Events; the reason is nearly always there.

- `Insufficient cpu/memory`: requests do not fit any node. Check `kubectl describe nodes`
  allocatable versus requested, lower requests, or scale nodes; check the Cluster Autoscaler
  or Karpenter logs for why it did not add a node (max size, instance quota, no matching
  node pool).
- `didn't match node selector / affinity` or `had taint that the pod didn't tolerate`:
  fix the selector, add a toleration, or label the node.
- `pod has unbound immediate PersistentVolumeClaims`: PVC is Pending. Check StorageClass
  exists, provisioner is running, zone matches (`WaitForFirstConsumer` avoids this), or
  the volume is still attached elsewhere.
- No events at all: scheduler is down or the pod has a `schedulerName` that does not exist,
  or a ResourceQuota or LimitRange rejected it (that shows on the owning ReplicaSet's
  events, not the pod).
- Scheduled but still Pending: kubelet problem on that node. Image pull in progress or
  failing, CNI cannot allocate an IP (subnet exhausted on EKS), or the node is NotReady.

### 17. How would you troubleshoot a running pod that cannot be reached?

Walk the path from the client toward the container and find the first hop that fails.

1. Does the pod itself answer? `kubectl exec` into it and `curl localhost:<port>`. If not,
   the app is bound to 127.0.0.1 instead of 0.0.0.0 or listening on a different port.
2. Is the pod Ready? `kubectl get pod -o wide`. A failing readiness probe removes it from
   Service endpoints silently.
3. Does the Service have endpoints? `kubectl get endpoints <svc>`. Empty means the selector
   does not match the pod labels, or no pod is Ready. Check `targetPort` matches the
   container port name or number.
4. From another pod in the cluster, `curl <pod-ip>:<port>` then `curl <svc-name>:<port>`.
   Pod IP works but Service does not: kube-proxy or the CNI's service handling. Service
   name fails but ClusterIP works: DNS, check CoreDNS pods and `resolv.conf`.
5. NetworkPolicy: `kubectl get netpol -A`; a default-deny in the namespace blocks ingress
   unless allowed. Also security groups for pods on EKS.
6. From outside: Ingress controller logs, load balancer target health, listener and
   certificate, and whether the LoadBalancer Service actually got an address.

Tools: `kubectl debug` with a netshoot ephemeral container, `tcpdump` on the node, and
`ss -lntp` inside the pod.

### 18. How would you safely perform maintenance on a Kubernetes worker node?

1. Check that the workloads on it can tolerate losing a replica: PodDisruptionBudgets exist
   and are not already at their minimum, and no single-replica critical pod is on the node.
2. `kubectl cordon <node>` so nothing new is scheduled there.
3. `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data --timeout=300s`. Drain
   evicts pods through the Eviction API, which respects PDBs; it will wait if a PDB blocks.
   If it blocks forever, do not force it, fix the PDB or scale the workload up first.
4. Do the maintenance (kernel patch, kubelet upgrade, hardware).
5. `kubectl uncordon <node>` and confirm it is Ready and pods schedule back.

On EKS with managed node groups this is automated by a rolling node group update, and
Karpenter does the same with drift and expiry; you still need correct PDBs and
`terminationGracePeriodSeconds` for it to be safe. For stateful pods, confirm the volume
can attach in the new node's zone.

### 19. How does persistent storage work in Kubernetes?

Three objects and a driver. A PersistentVolumeClaim is what a pod asks for: size, access
mode (`ReadWriteOnce`, `ReadOnlyMany`, `ReadWriteMany`) and a StorageClass. A
StorageClass names a provisioner (a CSI driver such as `ebs.csi.aws.com` or `efs.csi.aws.com`),
parameters (volume type, encryption), `reclaimPolicy` (Delete or Retain) and
`volumeBindingMode`. With `WaitForFirstConsumer` the volume is created only after the pod is
scheduled, so it lands in the right zone. The provisioner creates the backing disk and a
PersistentVolume object, the PVC binds to it, and when the pod is scheduled the CSI node
plugin attaches and mounts the disk on that node. EBS is `ReadWriteOnce` and zonal, so a
pod using it can only move within the zone and only one node can mount it; EFS is
`ReadWriteMany` for shared access. StatefulSets use `volumeClaimTemplates` so each replica
keeps its own volume across restarts. Snapshots are done through `VolumeSnapshot` CRDs.

### 20. How would you manage access and permissions within an EKS cluster?

Two layers: who you are, then what you can do. Identity comes from IAM. The modern way is
EKS access entries: map an IAM role or user to a Kubernetes user and groups, optionally with
an EKS access policy such as `AmazonEKSViewPolicy`. The older way is the `aws-auth`
ConfigMap in `kube-system`, which is fragile because a bad edit locks everyone out. Users
authenticate with `aws eks get-token`, which the `aws-iam-authenticator` on the control plane
validates. Then Kubernetes RBAC decides permissions: ClusterRoles and Roles bound to those
groups. Pattern I would use: one IAM role per team, mapped to a group, bound to a namespaced
`edit` Role in their namespaces and `view` cluster-wide; a break-glass admin role with
short sessions and CloudTrail alerts. For workloads, IRSA or EKS Pod Identity gives a pod its
own IAM role instead of the node role. Audit logging to CloudWatch, and OPA or Kyverno for
guardrails RBAC cannot express.

### 21. How would you upgrade a Kubernetes cluster without disrupting critical services?

Preparation matters more than the upgrade command.

- Read the release notes and run `kubent` or `pluto` to find manifests using removed APIs;
  upgrade Helm charts and operators first.
- Confirm every critical workload has at least two replicas, a PDB, anti-affinity across
  nodes, and correct readiness probes; otherwise draining will cause an outage.
- Upgrade one minor version at a time; kubelet may lag the API server by up to three minors
  but do not rely on it.
- Control plane first. On EKS this is a managed operation, the API server may be briefly
  unavailable but workloads keep running.
- Then add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI) to versions compatible with the new
  control plane.
- Then nodes, as a rolling replacement: bring up new nodes on the new AMI, cordon and drain
  old ones respecting PDBs, with a max unavailable of one or a small percentage. Use a surge
  so capacity never drops.
- Do it in staging first, and in production during a low-traffic window with a rollback plan
  for the node layer (keep the old node group until validated; control planes cannot be
  downgraded).
- Watch error rates, pod restarts and pending pods throughout, and pause if the PDB blocks
  drain longer than expected.

### 22. How would you make a CRD, operator and Helm deployment portable across different Kubernetes clusters?

- Package everything in one Helm chart with the CRDs in the `crds/` directory (or a separate
  CRD chart), since Helm does not upgrade CRDs in `crds/`; document that and version them.
- Parameterise every cluster-specific value: StorageClass name, Ingress class and annotations,
  image registry, IAM role ARN or workload identity annotation, node selectors, resource
  sizes. Keep sane defaults so the chart installs on a plain cluster.
- Set `kubeVersion` in `Chart.yaml` and avoid APIs newer than your oldest supported cluster.
- Build multi-arch images (amd64 and arm64) and avoid cloud-specific code paths in the
  operator; put cloud calls behind an interface with a provider flag.
- Use conversion-free CRD versions where possible and avoid webhooks unless needed, because
  webhooks need certificates (cert-manager) which differ per cluster.
- Ship a `values-eks.yaml`, `values-gke.yaml` and `values-kind.yaml`, and test the chart in CI
  on kind plus one managed cluster with `helm test` and a conformance smoke test.
- Manage installs with GitOps (Argo CD ApplicationSets) so the same chart and per-cluster
  values are applied consistently.

### 23. Tell us about a Kubernetes infrastructure incident you personally handled and how you resolved it.

Use your own incident; here is the shape and a fully worked example you can adapt.

**Context:** production EKS cluster running the API tier, about 40 services, autoscaled with
HPA and Cluster Autoscaler.

**Detection:** synthetic checks on the public API started failing at 09:12 with 502s; the
p99 latency alert fired a minute later. Error rate went from 0.1 % to 30 %.

**Diagnosis:** the load balancer showed half its targets unhealthy. `kubectl get pods`
showed dozens of pods in `Pending` and new pods `CrashLoopBackOff` on one node group.
Events said `FailedCreatePodSandBox ... failed to assign an IP address to pod`. The VPC CNI
had exhausted the free IPs in the subnets for that node group after a scale-out driven by a
traffic spike. Change history showed no deploy, which pointed at capacity, not code.

**Mitigation:** cordoned the affected node group so the scheduler used the healthy one,
raised the HPA max on the other group, and scaled down a non-critical batch workload to free
IPs. Error rate recovered within about eight minutes.

**Fix:** added secondary CIDR subnets and enabled custom networking for the CNI, set
`WARM_IP_TARGET` and `MINIMUM_IP_TARGET` so nodes did not hoard IPs, and added an alert on
`awscni_assigned_ip_addresses` against subnet capacity.

**Follow-up:** blameless postmortem, a runbook entry for IP exhaustion, and a load test that
reproduced the scale-out in staging. What I would do differently: the subnet sizing was a
known risk in a design review and did not get a ticket; now capacity risks get an owner and
a date.
