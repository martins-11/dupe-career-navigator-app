import LoginClient from './LoginClient';

/**
 * Login route (App Router).
 *
 * Renders a dual-panel (media + form) glassmorphism login page inspired by cn_login.png.
 * The interactive role switch (User/Admin) is implemented in a client component.
 */
export default function LoginPage() {
  return <LoginClient />;
}
