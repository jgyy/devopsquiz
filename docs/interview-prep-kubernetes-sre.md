# Interview prep: Kubernetes operators, messaging, observability, incidents

Short spoken answers, about 32 words each. The story answers use an invented CV (platform
engineer at a Singapore payments company, earlier a logistics startup). Swap in your own
projects, numbers and tool names before the interview, but keep the shape: context, problem,
action, result.

## Story questions

**What was your most complex project and why was it complex?**
Migrating our payments API from EC2 to EKS with zero downtime. Complex because of a 300 ms
p99 budget, PCI constraints, stateful Redis sessions, and cutting traffic over gradually
while both stacks ran.

**Tell us about a Kubernetes infrastructure incident you personally handled.**
Pods stuck Pending during a traffic spike; VPC CNI had exhausted subnet IPs. I cordoned the
starved node group, shifted load, added secondary CIDRs, and alerted on free IPs afterwards.

**How did you use Redis?**
Cache-aside for merchant profiles with 10 minute TTLs, plus rate limiting per API key.
ElastiCache with replicas; on failover we accepted a cold cache and used jittered TTLs to
avoid stampedes.

**How did you use SQS and Pub/Sub?**
SQS decoupled payment webhooks from workers, with a dead-letter queue after five receives and
idempotent consumers keyed on event id. Pub/Sub fanned settlement events to three downstream
teams via separate subscriptions.

**How did you use Fluentd?**
DaemonSet on every node tailing container logs with the Kubernetes metadata filter, routed by
namespace tag to OpenSearch and S3. File buffers with retries so an OpenSearch outage never
dropped logs.

**How did autoscaling work?**
Two layers: HPA on CPU and SQS backlog per pod via KEDA, Cluster Autoscaler for nodes.
PodDisruptionBudgets protected scale-in, and a three minute stabilisation window stopped
flapping during bursts.

**How did you write incident response?**
I wrote the plan: four severity levels, incident commander and comms roles, PagerDuty
escalation, a dedicated Slack channel template, runbook links, and a postmortem trigger for
anything Sev2 or above. We rehearsed quarterly.

**What were your p99 requirements and how did you meet them?**
300 ms p99 at the load balancer for authorisation calls. Measured from histograms in
Prometheus. We hit it by pooling database connections, caching merchant lookups in Redis,
and setting strict upstream timeouts.

**Which APM tools did you use?**
Datadog APM with OpenTelemetry tracing, propagating trace context through SQS message
attributes. Traces once revealed a retry loop doubling database load that logs alone showed
only as generic latency.

**How do you identify a down issue?**
Confirm from outside with synthetic checks, then walk inward: DNS, certificate, load balancer
target health, ingress, service endpoints, readiness probes. Check recent deploys before
restarting anything, then communicate status early.

**What did you do at your earlier company?**
At a logistics startup I ran the AWS platform for a tracking API: Terraform modules, a
Jenkins pipeline, Prometheus and Grafana, and the first on-call rotation for a team of eight
engineers.

## Kubernetes operator and troubleshooting questions

**What is the difference between a Custom Resource and a Custom Resource Definition?**
The CRD is the schema that registers a new API type with the API server, including versions
and validation. A CR is one instance of that type, with its own spec and status.

**When a Custom Resource is submitted through the Kubernetes API, where is it stored?**
In etcd, through the API server, exactly like built-in objects, under a key such as
`/registry/<group>/<plural>/<namespace>/<name>`. Controllers keep caches, but etcd is the only
source of truth.

**What happens after a Custom Resource is stored in etcd?**
The API server sends a watch event to anyone watching that type. The operator's informer
updates its cache, enqueues the object's key, and a worker calls Reconcile to converge state.

**What happens internally after you run `kubectl apply`?**
kubectl computes a merge patch, then the API server authenticates, authorises via RBAC, runs
mutating and validating admission, validates the schema, and writes to etcd. Controllers then
react asynchronously to watch events.

**How does a Kubernetes controller or operator work?**
It watches resources through informers, queues keys, and reconciles each one by comparing
desired spec to observed state and making changes. An operator adds application-specific
logic, usually driven by a CRD.

**What is a Kubernetes reconciliation loop?**
A level-triggered loop that repeatedly reads current state, compares it to desired state, and
takes a step to close the gap. It ignores what changed and re-reads everything, so missed
events are harmless.

**What is the difference between spec and status?**
Spec is desired state written by users or higher controllers; status is observed state
written only by the controller. The status subresource separates writes and RBAC for the
two, with observedGeneration linking them.

**How does an operator detect that a Custom Resource has been created or updated?**
Through a long-lived watch opened by its informer. The API server streams added, modified and
deleted events, the handler enqueues the key, and the informer re-lists if the connection
drops.

**Why must a Kubernetes controller be idempotent?**
The same key is reconciled many times: resyncs, restarts, leader changes, retries and child
resource changes. Reconcile must check before acting, use deterministic names, and create or
update rather than blindly create.

**What is a Kubernetes finalizer?**
A string in metadata.finalizers that blocks deletion. Deleting only sets deletionTimestamp;
the controller runs cleanup of external resources, removes its finalizer, and then the API
server deletes the object for real.

**What is the difference between an ownerReference and a finalizer?**
An ownerReference lets garbage collection delete children when the parent goes; it covers
in-cluster objects. A finalizer delays deletion until cleanup finishes; it covers external
resources and ordered teardown.

**How would you build a Kubernetes operator in Golang?**
Scaffold with Kubebuilder on controller-runtime, define Spec and Status types with markers,
generate CRDs and RBAC with controller-gen, implement Reconcile with CreateOrUpdate and owner
references, test with envtest, ship a distroless image.

**What RBAC permissions does a Kubernetes operator require?**
Get, list, watch, update and patch on the CR; update and patch on its status and finalizers
subresources; full CRUD on owned kinds; create on events; and leases for leader election.
Never cluster-admin.

**How would you handle failures, retries and requeuing within a Kubernetes operator?**
Return an error for transient failures to get exponential backoff, RequeueAfter for planned
waits, and nothing when done. Never sleep in Reconcile, record failures in status conditions,
and stop retrying permanent errors.

**How would you manage different versions of a CRD?**
Serve multiple versions with one storage version, add a conversion webhook when shapes differ,
migrate stored objects, mark old versions deprecated, then stop serving them. Prefer additive
optional fields over new versions.

**How would you troubleshoot a pod that remains in a Pending state?**
Read describe events first: insufficient resources, unmatched selectors or taints, unbound
PVCs, quota. No events points to the scheduler; scheduled but Pending points to kubelet, image
pulls, or CNI IP allocation.

**How would you troubleshoot a running pod that cannot be reached?**
Walk from the container outward: curl localhost inside the pod, check readiness and endpoints,
curl the pod IP then the service name from another pod, then NetworkPolicy, CoreDNS, ingress
and load balancer health.

**How would you safely perform maintenance on a Kubernetes worker node?**
Check PodDisruptionBudgets and single-replica workloads, cordon the node, drain it ignoring
DaemonSets so evictions respect PDBs, do the maintenance, uncordon, and confirm pods schedule
back and stay Ready.

**How does persistent storage work in Kubernetes?**
A PVC requests size, access mode and StorageClass; the CSI provisioner creates the disk and a
PV, the claim binds, and the node plugin attaches and mounts it. WaitForFirstConsumer keeps
volumes zone-aligned.

**How would you manage access and permissions within an EKS cluster?**
Map IAM roles to Kubernetes groups with EKS access entries, then bind groups with RBAC Roles
per team namespace. Give workloads their own IAM role via IRSA or Pod Identity, and audit
everything.

**How would you upgrade a Kubernetes cluster without disrupting critical services?**
Fix removed APIs and add PDBs first, upgrade one minor at a time, control plane, then add-ons,
then nodes by rolling replacement with surge capacity. Rehearse in staging, watch error rates,
keep old nodes until validated.

**How would you make a CRD, operator and Helm deployment portable across different Kubernetes clusters?**
One Helm chart with CRDs shipped alongside, every cluster-specific value parameterised with
sane defaults, kubeVersion pinned, multi-arch images, cloud calls behind an interface, and CI
testing on kind plus one managed cluster.

**Tell us about a Kubernetes infrastructure incident you personally handled and how you resolved it.**
Synthetic checks failed with 502s; half the targets were unhealthy and pods were Pending
with sandbox IP errors. I cordoned the starved node group, freed IPs, then added subnets and
an IP capacity alert.
