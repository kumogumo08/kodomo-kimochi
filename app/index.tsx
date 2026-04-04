import { Redirect } from 'expo-router';

/**
 * ルート。インタラクティブチュートリアルは各画面のオーバーレイで行うため、ここではタブへ集約する。
 */
export default function IndexGate() {
  return <Redirect href="/(tabs)" />;
}
