export function detectLoginStatus(doc: Document): boolean {
  const loginButton = doc.querySelector('a[href*="/web/user/?ka=header-login"], .btn-signin');
  if (loginButton) {
    return false;
  }

  const loginEntry = doc.querySelector('a[href*="/web/user"]');
  const avatar = doc.querySelector(".avatar, .user-nav");
  if (loginEntry || avatar) {
    return true;
  }

  // 所有选择器均未命中时，保守判断为未登录，避免在未登录页面触发采集
  return false;
}
