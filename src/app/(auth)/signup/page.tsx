import { phoneCountries } from "@/lib/auth/phone-country";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return <SignupForm countries={phoneCountries} />;
}
