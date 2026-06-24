import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE, SUPPORTED_FORMATS } from '@/lib/site';

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'radial-gradient(circle at 20% 20%, #1a2030 0%, #0b0d12 60%)',
          color: '#fbfbfd',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 9999,
              background:
                'linear-gradient(135deg, #ff3b30 0%, #34c759 50%, #0a84ff 100%)',
            }}
          />
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            Free Online
            <br />
            Image Converter
          </span>
          <span style={{ fontSize: 32, color: '#9aa4b2', maxWidth: 900 }}>
            {SUPPORTED_FORMATS.join(' · ')}
          </span>
        </div>

        <span style={{ fontSize: 28, color: '#9aa4b2' }}>
          100% private — runs in your browser, no upload required.
        </span>
      </div>
    ),
    { ...size },
  );
}
