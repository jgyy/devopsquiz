export const DOMAIN_IDS = [
  'docker',
  'kubernetes',
  'cicd',
  'linux',
  'git',
  'terraform',
  'aws',
  'networking',
  'monitoring',
  'security',
] as const

export type Domain = (typeof DOMAIN_IDS)[number]

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'docker', label: 'Docker' },
  { id: 'kubernetes', label: 'Kubernetes' },
  { id: 'cicd', label: 'CI/CD' },
  { id: 'linux', label: 'Linux' },
  { id: 'git', label: 'Git' },
  { id: 'terraform', label: 'Terraform' },
  { id: 'aws', label: 'AWS' },
  { id: 'networking', label: 'Networking' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'security', label: 'Security' },
]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
