import { useContext } from 'react'
import { Ctx, type SessionApi } from './context'

export function useSession(): SessionApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession must be used inside SessionProvider')
  return v
}
