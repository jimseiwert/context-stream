"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { FieldDefinition } from "@/lib/providers/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProviderConfigFormProps {
  fields: FieldDefinition[];
  defaultValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onTest?: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  isTesting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProviderConfigForm({
  fields,
  defaultValues = {},
  onSubmit,
  onTest,
  submitLabel = "Save",
  isLoading = false,
  isTesting = false,
}: ProviderConfigFormProps) {
  // Build initial form values: seed from defaultValues, fill missing required
  // fields with empty string so react-hook-form tracks them.
  const initial: Record<string, unknown> = {};
  for (const field of fields) {
    initial[field.key] =
      defaultValues[field.key] !== undefined ? defaultValues[field.key] : "";
  }

  const form = useForm<Record<string, unknown>>({ defaultValues: initial });

  // Track filenames for file-json fields separately (display only)
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  // Keep a ref per file-json input so we can reset it
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((field) => (
          <FormField
            key={field.key}
            control={form.control}
            name={field.key}
            rules={{
              validate: (value) => {
                if (!field.required) return true;
                // file-json: value must be a non-null object
                if (field.type === "file-json") {
                  if (value && typeof value === "object") return true;
                  return `${field.label} is required`;
                }
                if (value === "" || value === null || value === undefined) {
                  return `${field.label} is required`;
                }
                return true;
              },
            }}
            render={({ field: rhfField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </FormLabel>

                {/* ---- text / password / url ---- */}
                {(field.type === "text" ||
                  field.type === "password" ||
                  field.type === "url") && (
                  <FormControl>
                    <Input
                      type={field.type === "text" ? "text" : field.type}
                      placeholder={field.placeholder}
                      value={
                        typeof rhfField.value === "string"
                          ? rhfField.value
                          : ""
                      }
                      onChange={rhfField.onChange}
                      onBlur={rhfField.onBlur}
                      name={rhfField.name}
                      ref={rhfField.ref}
                    />
                  </FormControl>
                )}

                {/* ---- textarea ---- */}
                {field.type === "textarea" && (
                  <FormControl>
                    <Textarea
                      placeholder={field.placeholder}
                      className="min-h-[120px] resize-y font-mono text-sm"
                      value={
                        typeof rhfField.value === "string"
                          ? rhfField.value
                          : ""
                      }
                      onChange={rhfField.onChange}
                      onBlur={rhfField.onBlur}
                      name={rhfField.name}
                      ref={rhfField.ref}
                    />
                  </FormControl>
                )}

                {/* ---- select ---- */}
                {field.type === "select" && (
                  <Select
                    value={
                      typeof rhfField.value === "string"
                        ? rhfField.value
                        : ""
                    }
                    onValueChange={(val) => {
                      rhfField.onChange(val);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            field.placeholder ?? `Select ${field.label}`
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* ---- file-json ---- */}
                {field.type === "file-json" && (
                  <div className="space-y-2">
                    <label
                      htmlFor={`file-json-${field.key}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      {fileNames[field.key] ? (
                        <span className="text-foreground">
                          {fileNames[field.key]}
                        </span>
                      ) : (
                        <span>
                          {field.placeholder ?? "Upload JSON file…"}
                        </span>
                      )}
                      <input
                        id={`file-json-${field.key}`}
                        type="file"
                        accept=".json,application/json"
                        className="sr-only"
                        ref={(el) => {
                          fileInputRefs.current[field.key] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const parsed = JSON.parse(
                                evt.target?.result as string
                              );
                              rhfField.onChange(parsed);
                              setFileNames((prev) => ({
                                ...prev,
                                [field.key]: file.name,
                              }));
                            } catch {
                              form.setError(field.key, {
                                message: "Invalid JSON file",
                              });
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                    {fileNames[field.key] && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                        onClick={() => {
                          rhfField.onChange("");
                          setFileNames((prev) => {
                            const next = { ...prev };
                            delete next[field.key];
                            return next;
                          });
                          if (fileInputRefs.current[field.key]) {
                            fileInputRefs.current[field.key]!.value = "";
                          }
                        }}
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                )}

                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className={onTest ? "flex gap-2" : ""}>
          {onTest && (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isTesting}
              onClick={() => void onTest(form.getValues())}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTesting ? "Testing…" : "Test Connection"}
            </Button>
          )}
          <Button type="submit" disabled={isLoading || isTesting} className={onTest ? "flex-1" : "w-full"}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
