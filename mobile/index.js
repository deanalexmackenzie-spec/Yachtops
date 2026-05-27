import { registerRootComponent } from 'expo';
import { View, Text, StyleSheet } from 'react-native';

function App() {
  return (
    <View style={s.container}>
      <Text style={s.text}>YachtOps is running</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#1c1917' },
});

export default registerRootComponent(App);
