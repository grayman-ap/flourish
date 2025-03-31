import DebugPanel from "../debug";
import { TenantProvider } from "./contexts/tenant-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TenantProvider>
          {children}
          <DebugPanel />
        </TenantProvider>
      </body>
    </html>
  );
}
