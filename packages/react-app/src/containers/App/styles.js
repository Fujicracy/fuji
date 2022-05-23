import styled from 'styled-components';
import { Box } from 'rebass';
import { BaseModalBackground } from 'styled-react-modal';
import { themeGet } from '@styled-system/theme-get';

export const Container = styled(Box)`
  min-height: 100vh;
`;

export const FadingBackground = styled(BaseModalBackground)`
  @supports (-webkit-backdrop-filter: none) or (backdrop-filter: none) {
    backdrop-filter: blur(5px);
  }
  @supports not ((-webkit-backdrop-filter: none) or (backdrop-filter: none)) {
    background-color: rgba(0, 0, 0, 0.7);
  }
  transition: all 0.3s ease-in-out;
`;

export const NavText = styled.div`
  margin-right: 10px;
  font-size: 12px;

  color: ${themeGet('colors.text64')};

  &:hover {
    color: ${themeGet('colors.primary')};
  }
`;
