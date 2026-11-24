import { useId } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
interface ComposerProps {
  value: string;
  placeholder?: string;
  buttonLabel?: string;
  isSubmitting?: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}
export const Composer = ({
  value,
  placeholder = "分享一下你的近况吧。",
  buttonLabel = "发布",
  isSubmitting = false,
  compact = false,
  onChange,
  onSubmit,
}: ComposerProps) => {
  const remaining = 280 - Array.from(value).length;
  const id = useId();
  return (
    <form
      className={cn("border-b p-4 md:p-6", compact && "mt-3 rounded-xl border")}
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() && !isSubmitting && remaining >= 0) onSubmit();
      }}
    >
      <FieldGroup>
        <Field data-invalid={remaining < 0}>
          <FieldLabel htmlFor={id} className="sr-only">
            {compact ? "回复内容" : "帖子内容"}
          </FieldLabel>
          <Textarea
            id={id}
            name={compact ? "reply" : "post"}
            className="min-h-28"
            placeholder={placeholder}
            value={value}
            aria-invalid={remaining < 0}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
        <div className="flex items-center justify-end gap-3">
          <Badge
            variant={remaining < 30 ? "destructive" : "secondary"}
            aria-label="剩余字数"
          >
            {remaining}
          </Badge>
          <Button
            type="submit"
            disabled={!value.trim() || isSubmitting || remaining < 0}
          >
            {isSubmitting ? (
              <Spinner aria-hidden="true" data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            {isSubmitting ? "发送中" : buttonLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};
