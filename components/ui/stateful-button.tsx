import * as React from "react"
import { Check, Loader2 } from "lucide-react"
import { Button, type ButtonProps } from "./button"

export interface StatefulButtonProps extends ButtonProps {
  isLoading?: boolean
  isSuccess?: boolean
  idleText?: React.ReactNode
  loadingText?: React.ReactNode
  successText?: React.ReactNode
  loadingIcon?: React.ReactNode
  successIcon?: React.ReactNode
}

export const StatefulButton = React.forwardRef<HTMLButtonElement, StatefulButtonProps>(
  (
    {
      isLoading = false,
      isSuccess = false,
      idleText,
      loadingText = "Submitting…",
      successText = "All set!",
      loadingIcon,
      successIcon,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const showLoading = isLoading && !isSuccess
    const showSuccess = isSuccess

    return (
      <Button
        ref={ref}
        className={className}
        disabled={disabled ?? (showLoading || showSuccess)}
        aria-busy={showLoading || undefined}
        {...props}
      >
        {showSuccess ? (
          <span className="inline-flex items-center gap-2">
            {successIcon ?? <Check className="h-4 w-4" />}
            {successText}
          </span>
        ) : showLoading ? (
          <span className="inline-flex items-center gap-2">
            {loadingIcon ?? <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingText}
          </span>
        ) : (
          <>{idleText ?? children}</>
        )}
      </Button>
    )
  }
)

StatefulButton.displayName = "StatefulButton"

export default StatefulButton


