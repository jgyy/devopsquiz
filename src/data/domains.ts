// Domains are listed alphabetically by label; this order drives the Home page checkboxes and the Stats table.
export const DOMAIN_IDS = [
  'aws',
  'cicd',
  'docker',
  'git',
  'kubernetes',
  'linux',
  'monitoring',
  'networking',
  'security',
  'terraform',
] as const

export type Domain = (typeof DOMAIN_IDS)[number]

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'aws', label: 'AWS' },
  { id: 'cicd', label: 'CI/CD' },
  { id: 'docker', label: 'Docker' },
  { id: 'git', label: 'Git' },
  { id: 'kubernetes', label: 'Kubernetes' },
  { id: 'linux', label: 'Linux' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'networking', label: 'Networking' },
  { id: 'security', label: 'Security' },
  { id: 'terraform', label: 'Terraform' },
]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
