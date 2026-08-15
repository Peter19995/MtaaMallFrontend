import { createContext, ReactNode, useState } from 'react'

type Branch = {
  id: string
  name: string
}

type BranchContextValue = {
  branch: Branch | null
  setBranch: (branch: Branch) => void
}

export const BranchContext = createContext<BranchContextValue | undefined>(undefined)

type Props = {
  children: ReactNode
}

export const BranchProvider = ({ children }: Props) => {
  const [branch, setBranchState] = useState<Branch | null>(null)

  const setBranch = (next: Branch) => {
    setBranchState(next)
  }

  return (
    <BranchContext.Provider
      value={{
        branch,
        setBranch
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

