/**
 * Order History Exporter for Amazon - Background Script
 * Handles file downloads and cross-script communication
 */

import browser from 'webextension-polyfill';
import type { DownloadData, MessagePayload } from '../types';

/**
 * Get localized message from browser i18n API
 */
function getMessage(key: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions) || key;
}

// Listen for messages from content scripts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
browser.runtime.onMessage.addListener((message: any, _sender: any) => {
  const msg = message as MessagePayload;

  if (msg.action === 'downloadFile') {
    return downloadFile(msg.data as DownloadData)
      .then(() => ({ success: true }))
      .catch((error: Error) => ({ success: false, error: error.message }));
  }

  if (msg.action === 'updateProgress') {
    // Forward progress updates to popup if it's open
    browser.runtime.sendMessage(message).catch(() => {
      // Popup might be closed, ignore error
    });
  }

  return undefined;
});

/**
 * Download file using the browser's download API
 */
async function downloadFile(data: DownloadData): Promise<number> {
  const { content, fileName, mimeType } = data;

  // Use data URL for Chrome MV3 service worker compatibility
  // Service workers don't have access to URL.createObjectURL
  const base64Content = globalThis.btoa(unescape(encodeURIComponent(content)));
  const dataUrl = `data:${mimeType};base64,${base64Content}`;

  // Trigger download
  const downloadId = await browser.downloads.download({
    url: dataUrl,
    filename: fileName,
    saveAs: true,
  });

  return downloadId;
}

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log(getMessage('extensionInstalled'));
  } else if (details.reason === 'update') {
    console.log(getMessage('extensionUpdated'), browser.runtime.getManifest().version);
  }
});
