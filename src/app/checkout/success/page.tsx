import { Suspense } from "react";
import { CheckoutSuccessClient } from "./success-client";

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
