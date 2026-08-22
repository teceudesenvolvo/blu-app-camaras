import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import styled from 'styled-components/native';
import { portalGradients, portalTheme } from '../styles/portalTheme';

export const PortalBackground = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.gradients?.page || portalGradients.page,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  flex: 1;
`;

export const PortalScroll = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.portal.page};
`;

export const PortalHeader = styled.View`
  padding: ${props => props.compact ? '68px 22px 18px' : '72px 24px 24px'};
  background-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(7, 19, 31, 0.92)' : 'rgba(255, 255, 255, 0.88)'};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.portal.border};
`;

export const PortalHeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const PortalBackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 21px;
  background-color: ${({ theme }) => theme.portal.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

export const PortalTitleGroup = styled.View`
  flex: 1;
`;

export const PortalEyebrow = styled.Text`
  color: ${({ theme }) => theme.portal.primary};
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0px;
`;

export const PortalTitle = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.portal.text};
  font-size: ${props => props.large ? '30px' : '22px'};
  font-weight: 900;
  line-height: ${props => props.large ? '36px' : '28px'};
`;

export const PortalSubtitle = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.portal.muted};
  font-size: 14px;
  line-height: 21px;
`;

export const PortalCard = styled.View`
  background-color: ${({ theme }) => theme.portal.card};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  padding: ${props => props.padding || '18px'};
  shadow-color: #0f172a;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.08;
  shadow-radius: 18px;
  elevation: 3;
`;

export const PortalInput = styled.TextInput`
  min-height: 52px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.portal.border};
  background-color: ${({ theme }) => theme.portal.card};
  padding: 0 15px;
  color: ${({ theme }) => theme.portal.text};
  font-size: 16px;
`;

export const PortalLabel = styled.Text`
  color: ${({ theme }) => theme.portal.text};
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 8px;
`;

export const PortalPrimaryButton = styled.TouchableOpacity`
  min-height: 54px;
  border-radius: 12px;
  overflow: hidden;
  opacity: ${props => props.disabled ? 0.72 : 1};
  shadow-color: ${({ theme }) => theme.portal.primary};
  shadow-offset: 0px 8px;
  shadow-opacity: 0.22;
  shadow-radius: 14px;
  elevation: 4;
`;

export const PortalButtonGradient = styled(LinearGradient).attrs(({ theme }) => ({
  colors: theme.gradients?.primary || portalGradients.primary,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}))`
  min-height: 54px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  padding: 0 18px;
`;

export const PortalButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
`;

export const PortalIconBadge = styled.View`
  width: ${props => props.size || '44px'};
  height: ${props => props.size || '44px'};
  border-radius: ${props => props.radius || '22px'};
  background-color: rgba(2, 90, 161, 0.10);
  align-items: center;
  justify-content: center;
`;

export function PortalScreenHeader({ navigation, title, eyebrow, subtitle, canGoBack = true }) {
  return (
    <PortalHeader compact>
      <PortalHeaderRow>
        {canGoBack ? (
          <PortalBackButton onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color={portalTheme.primary} />
          </PortalBackButton>
        ) : null}
        <PortalTitleGroup>
          {eyebrow ? <PortalEyebrow>{eyebrow}</PortalEyebrow> : null}
          <PortalTitle>{title}</PortalTitle>
          {subtitle ? <PortalSubtitle>{subtitle}</PortalSubtitle> : null}
        </PortalTitleGroup>
      </PortalHeaderRow>
    </PortalHeader>
  );
}

export const portalShadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  default: {
    elevation: 3,
  },
});
