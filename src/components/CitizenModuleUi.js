import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { PortalBackground, PortalScreenHeader } from './PortalScaffold';

export function ModulePage({ navigation, title, subtitle, children }) {
  return <PortalBackground>
    <PortalScreenHeader navigation={navigation} title={title} subtitle={subtitle} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 110 }}>{children}</ScrollView>
  </PortalBackground>;
}

export function ModuleText({ children, muted = false, heading = false, style }) {
  const colors = useTheme().portal;
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: heading ? 18 : 14, lineHeight: heading ? 24 : 21, fontWeight: heading ? '800' : '400' }, style]}>{children}</Text>;
}

export function ModuleButton({ children, onPress, disabled = false, secondary = false, style }) {
  const colors = useTheme().portal;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={[{ minHeight: 48, marginTop: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: secondary ? 1 : 0, borderColor: colors.border, backgroundColor: secondary ? colors.card : colors.primary, opacity: disabled ? 0.5 : 1 }, style]}>
    <Text style={{ color: secondary ? colors.primary : '#fff', textAlign: 'center', fontWeight: '800', fontSize: 14 }}>{children}</Text>
  </TouchableOpacity>;
}

export function ModuleField({ label, value, onChangeText, multiline = false, keyboardType = 'default', maxLength = 2000, placeholder = '', editable = true }) {
  const colors = useTheme().portal;
  return <View style={{ marginTop: 16 }}>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 7 }}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} maxLength={maxLength} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor={colors.muted} editable={editable} style={{ minHeight: multiline ? 120 : 48, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, fontSize: 15 }} />
  </View>;
}

export function ModuleRow({ title, detail, onPress, disabled = false, children }) {
  const colors = useTheme().portal;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ padding: 15, marginTop: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8 }}>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, lineHeight: 21 }}>{title}</Text>
    {detail ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 }}>{detail}</Text> : null}
    {children}
  </TouchableOpacity>;
}

export function ModuleError({ children }) {
  const colors = useTheme().portal;
  return children ? <Text selectable style={{ color: colors.danger, marginTop: 15, lineHeight: 20 }}>{children}</Text> : null;
}
