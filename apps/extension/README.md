# Passage Clipper

Load this folder as an unpacked Chromium extension from `chrome://extensions` (developer mode). In Firefox use `about:debugging`, Load Temporary Add-on, and choose manifest.json. Permanent distribution requires store signing; that has not been performed.

Select webpage text, open Passage Clipper, enter your server and a revocable token created in Passage Settings, then Connect server. The extension requests access only to the chosen server. Review the text and metadata, then Save highlight. A failed highlight request can be retried with the same operation ID for the lifetime of the popup.

The extension only reads the active tab after you open it. The token is stored locally in this browser profile, not browser sync. Shared ChatGPT passages use the same explicit selection flow. No background conversation scraping or full-page capture.
