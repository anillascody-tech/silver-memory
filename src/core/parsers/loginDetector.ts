export function detectLoginStatus(doc: Document): boolean {
  const loginEntry = doc.querySelector('a[href*="/web/user"]');
  const avatar = doc.querySelector(".avatar, .user-nav");
  const loginButton = doc.querySelector('a[href*="/web/user/?ka=header-login"], .btn-signin');

  if (loginEntry || avatar) {
    return true;
  }

  if (loginButton) {
    return false;
  }

  return true;
}
