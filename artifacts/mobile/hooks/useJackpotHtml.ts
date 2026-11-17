import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';

const HTML = {
  portrait: require('../assets/jackpot/portrait.html') as number,
  landscape: require('../assets/jackpot/landscape.html') as number,
};

/**
 * The owner's Jackpot pages live as assets so they stay out of the JS bundle.
 * Portrait and landscape stay separate files.
 */
export function useJackpotHtml(page: 'portrait' | 'landscape'): string | null {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setHtml(null);
    const asset = Asset.fromModule(HTML[page]);
    asset.downloadAsync().then(async () => {
      const uri = asset.localUri ?? asset.uri;
      if (!uri) return;
      const text = await fetch(uri).then((response) => response.text());
      if (live) setHtml(text);
    }).catch(() => {
      if (live) setHtml(null);
    });
    return () => {
      live = false;
    };
  }, [page]);

  return html;
}
