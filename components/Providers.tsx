'use client';

// Everything the whole app needs, set up once at the root (CDS theme + our intake state).

import { MediaQueryProvider, ThemeProvider } from '@coinbase/cds-web/system';
import { PortalProvider } from '@coinbase/cds-web/overlays/PortalProvider';
import { defaultTheme } from '@coinbase/cds-web/themes/defaultTheme';
import { IntakeProvider } from '@/lib/IntakeContext';
import { PipelineProvider } from '@/lib/PipelineContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MediaQueryProvider>
      <ThemeProvider theme={defaultTheme} activeColorScheme="light">
        <PortalProvider>
          <IntakeProvider>
            <PipelineProvider>{children}</PipelineProvider>
          </IntakeProvider>
        </PortalProvider>
      </ThemeProvider>
    </MediaQueryProvider>
  );
}
