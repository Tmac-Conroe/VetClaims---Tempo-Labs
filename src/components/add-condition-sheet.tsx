import React, { useState } from "react";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddConditionSheetProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    claimType: string;
    diagnosticCode: string | null;
  }) => void;
  isSubmitting: boolean;
}

const AddConditionSheet: React.FC<AddConditionSheetProps> = ({
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [conditionName, setConditionName] = useState("");
  const [claimType, setClaimType] = useState("Primary");
  const [diagnosticCode, setDiagnosticCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = conditionName.trim();
    const trimmedCode = diagnosticCode.trim();

    if (trimmedName) {
      onSubmit({
        name: trimmedName,
        claimType: claimType,
        diagnosticCode: trimmedCode || null,
      });
      // Optional: Clear input and close after submit? Let's keep it open for now.
      // setConditionName('');
      // setClaimType('Primary');
      // setDiagnosticCode('');
      // onClose();
    } else {
      // Call onSubmit with empty name to trigger the validation in the parent component
      onSubmit({
        name: "",
        claimType: claimType,
        diagnosticCode: trimmedCode || null,
      });
      console.warn("Condition name cannot be empty");
    }
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Add Custom Condition</SheetTitle>
        <SheetDescription>
          Enter the details for your condition below. Specifying the claim type
          helps tailor the interview process. The diagnostic code is optional
          but helpful.
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={handleSubmit}>
        <div className="py-4 space-y-4">
          {/* Condition Name Input */}
          <div>
            <Label htmlFor="condition-name">Condition Name *</Label>
            <Input
              id="condition-name"
              placeholder="e.g., Tinnitus, Lower Back Strain"
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Claim Type Select */}
          <div>
            <Label htmlFor="claim-type">Claim Type *</Label>
            <Select
              value={claimType}
              onValueChange={setClaimType}
              defaultValue="Primary"
              required
            >
              <SelectTrigger id="claim-type" className="mt-1">
                <SelectValue placeholder="Select claim type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary">
                  Primary (Caused by service)
                </SelectItem>
                <SelectItem value="Secondary">
                  Secondary (Caused by another service-connected condition)
                </SelectItem>
                <SelectItem value="Aggravation">
                  Aggravation (Worsened by service)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select how this condition relates to your service.
            </p>
          </div>

          {/* Diagnostic Code Input */}
          <div>
            <Label htmlFor="diagnostic-code">Diagnostic Code (Optional)</Label>
            <Input
              id="diagnostic-code"
              placeholder="e.g., 6260 for Tinnitus"
              value={diagnosticCode}
              onChange={(e) => setDiagnosticCode(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the 4-digit VA code if known.
            </p>
          </div>

          {/* Placeholder for AI Suggestions */}
          <div className="mt-4 h-24 border rounded-md p-2 bg-gray-50 text-sm text-gray-400 italic flex items-center justify-center">
            <span>Future AI suggestions based on name...</span>
          </div>
        </div>

        <SheetFooter className="mt-auto pt-4 border-t">
          <SheetClose asChild>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Condition"}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
};

export default AddConditionSheet;
