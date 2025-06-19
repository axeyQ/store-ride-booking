import { cn } from "@/lib/utils";

const LabelInputContainer = ({
    children,
    className,
  }) => {
    return (
      <div className={cn("flex w-full flex-col space-y-2", className)}>
        {children}
      </div>
    );
  };

export default LabelInputContainer;