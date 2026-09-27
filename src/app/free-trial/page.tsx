import { redirect } from 'next/navigation';

export default function FreeTrialRedirect() {
  redirect('/register?plan=starter');
}
