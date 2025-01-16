// CANNOT USE await
export function getAlipna() {
  return fetch(
    new URL('../../styles/alpina/GT-Alpina-Standard-Regular.ttf', import.meta.url).toString(),
  ).then((res) => res.arrayBuffer());
}
