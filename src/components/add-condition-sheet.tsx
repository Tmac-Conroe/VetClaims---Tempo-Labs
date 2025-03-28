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

interface AddConditionSheetProps {
  onClose: () => void;
  onSubmit: (conditionName: string) => void;
  isSubmitting: boolean;
}

const AddConditionSheet: React.FC<AddConditionSheetProps> = ({
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [conditionName, setConditionName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission if we wrap in a form later
    if (conditionName.trim()) {
      onSubmit(conditionName.trim());
      // Optional: Clear input and close after submit? Let's keep it open for now.
      // setConditionName('');
      // onClose();
    } else {
      // Call onSubmit with empty string to trigger the validation in the parent component
      onSubmit("");
      console.warn("Condition name cannot be empty");
    }
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Add Custom Condition</SheetTitle>
        <SheetDescription>
          Type the name of your condition below. We'll suggest matches as you
          type.
        </SheetDescription>
      </SheetHeader>
      {/* We might wrap this in a <form> later if needed */}
      <div className="py-4 space-y-4">
        <div>
          <Label htmlFor="condition-name">Condition Name</Label>
          <Input
            id="condition-name"
            placeholder="e.g., Tinnitus, PTSD"
            value={conditionName}
            onChange={(e) => setConditionName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="mt-4 h-40 border rounded-md p-2 bg-gray-50 text-sm text-gray-400 italic flex items-center justify-center">
          <span>AI suggestions will appear here...</span>
        </div>
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetClose>
        {/* We use onClick here instead of form submit for now */}
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Condition"}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
};

export default AddConditionSheet;
