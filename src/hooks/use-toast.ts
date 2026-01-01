import * as React from "react"
import type { ToastProps } from "@/components/ui/toast"

export type ToasterToast = ToastProps & {
  id: string
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  return {
    toasts,
    toast: (toast: ToasterToast) =>
      setToasts((prev) => [...prev, toast]),
  }
}
