import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

const ShareButton = ({
  path,        // e.g. '/game/abc-123'
  title = 'StatStream',
  toast,
  compact = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title });
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
    }
    // fallback — clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast?.success('Link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast?.error('Could not copy link');
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        title="Share"
        className={`p-2 transition rounded-lg ${className}`}
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 transition font-bold text-xs ${className}`}
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
};

export default ShareButton;