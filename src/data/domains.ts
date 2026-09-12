// Domains are listed alphabetically by label; this order drives the Home page checkboxes and the Stats table.
export const DOMAIN_IDS = [
  'ansible',
  'aws',
  'azure',
  'backstage',
  'cicd',
  'cilium',
  'databases',
  'docker',
  'git',
  'gitops',
  'helm',
  'istio',
  'kubernetes',
  'linux',
  'monitoring',
  'networking',
  'platform',
  'security',
  'sre',
  'terraform',
] as const

export type Domain = (typeof DOMAIN_IDS)[number]

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'ansible', label: 'Ansible' },
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'backstage', label: 'Backstage' },
  { id: 'cicd', label: 'CI/CD' },
  { id: 'cilium', label: 'Cilium' },
  { id: 'databases', label: 'Databases' },
  { id: 'docker', label: 'Docker' },
  { id: 'git', label: 'Git' },
  { id: 'gitops', label: 'GitOps & Argo' },
  { id: 'helm', label: 'Helm' },
  { id: 'istio', label: 'Istio' },
  { id: 'kubernetes', label: 'Kubernetes' },
  { id: 'linux', label: 'Linux' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'networking', label: 'Networking' },
  { id: 'platform', label: 'Platform Engineering' },
  { id: 'security', label: 'Security' },
  { id: 'sre', label: 'SRE Practices' },
  { id: 'terraform', label: 'Terraform' },
]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
