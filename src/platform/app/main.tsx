import './styles.css';
// Both entry modes use the published index document, including subpath static hosts.
// Loading Studio's router here would execute host code in the preview.
if (new URLSearchParams(location.search).get('studio-preview') === '1') {
  void import('@/platform/modules/view/preview/main');
} else {
  void import('./StudioRoot');
}
