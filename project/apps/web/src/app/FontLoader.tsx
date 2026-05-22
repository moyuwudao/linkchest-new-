'use client';

export default function FontLoader() {
  return (
    <>
      <link
        href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css"
        rel="stylesheet"
        media="print"
        onLoad={(e) => { (e.target as HTMLLinkElement).media = 'all'; }}
      />
      <noscript>
        <link
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css"
          rel="stylesheet"
        />
      </noscript>
    </>
  );
}
