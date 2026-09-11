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

## Kubernetes operator questions: one-line anchors

- CRD defines the type; CR is an instance. Stored in etcd via the API server.
- After storage: watch event, informer cache, work queue, reconcile.
- `kubectl apply`: client diff or server-side apply, authn, authz, admission, validation, etcd, controllers.
- Reconcile is level-triggered: read the key, re-read state, converge, return `Result`.
- `spec` is desired, `status` is observed; `/status` subresource separates them.
- Idempotent because of resyncs, replays, retries and restarts.
- Finalizer blocks deletion for cleanup; ownerReference drives garbage collection of children.
- Go: Kubebuilder or Operator SDK on controller-runtime, `controller-gen` for CRDs and deepcopy.
- RBAC: get/list/watch on the CR, patch on `/status`, CRUD on owned kinds, events, leases.
- Failures: return error for backoff, `RequeueAfter` for planned waits, never block.
- CRD versions: multiple served versions, one storage version, conversion webhook.
- Pending: `describe` events, resources, taints, affinity, PVC binding, quota.
- Unreachable: endpoints, readiness, port mapping, curl the pod IP, NetworkPolicy, DNS.
- Node maintenance: PDBs, cordon, drain, uncordon.
- Storage: PVC, StorageClass, CSI driver, PV, access and binding modes.
- EKS access: IAM identity to Kubernetes identity (access entries or aws-auth), then RBAC.
- Upgrade: one minor at a time, control plane first, API removals, PDBs, surge nodes, add-ons.
- Portable: parameterise cluster-specific values, ship CRDs, multi-arch images, `kubeVersion`.
