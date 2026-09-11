// Domains are listed alphabetically by label; this order drives the Home page checkboxes and the Stats table.
export const DOMAIN_IDS = [
  'aws',
  'backstage',
  'cicd',
  'cilium',
  'docker',
  'git',
  'gitops',
  'istio',
  'kubernetes',
  'linux',
  'monitoring',
  'networking',
  'platform',
  'security',
  'terraform',
] as const

export type Domain = (typeof DOMAIN_IDS)[number]

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'aws', label: 'AWS' },
  { id: 'backstage', label: 'Backstage' },
  { id: 'cicd', label: 'CI/CD' },
  { id: 'cilium', label: 'Cilium' },
  { id: 'docker', label: 'Docker' },
  { id: 'git', label: 'Git' },
  { id: 'gitops', label: 'GitOps & Argo' },
  { id: 'istio', label: 'Istio' },
  { id: 'kubernetes', label: 'Kubernetes' },
  { id: 'linux', label: 'Linux' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'networking', label: 'Networking' },
  { id: 'platform', label: 'Platform Engineering' },
  { id: 'security', label: 'Security' },
  { id: 'terraform', label: 'Terraform' },
]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
