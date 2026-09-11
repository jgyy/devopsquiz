import aws from './questions/aws.json'
import cicd from './questions/cicd.json'
import docker from './questions/docker.json'
import git from './questions/git.json'
import kubernetes from './questions/kubernetes.json'
import linux from './questions/linux.json'
import monitoring from './questions/monitoring.json'
import networking from './questions/networking.json'
import security from './questions/security.json'
import terraform from './questions/terraform.json'
import type { Question } from './schema'
import { validateBank } from './validate'

export const BANK_FILES: Record<string, unknown> = {
  docker,
  kubernetes,
  cicd,
  linux,
  git,
  terraform,
  aws,
  networking,
  monitoring,
  security,
}

const result = validateBank(BANK_FILES)
if (result.errors.length > 0) {
  throw new Error(`Question bank is invalid:\n${result.errors.slice(0, 20).join('\n')}`)
}

export const QUESTIONS: Question[] = result.questions
export type { Question } from './schema'
