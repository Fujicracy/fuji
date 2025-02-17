import styled from 'styled-components';
import { size, color, space, width, height, padding } from 'styled-system';
import { Box, Image } from 'rebass';
import { fujiMedia } from 'consts';
import Modal from 'styled-react-modal';
import { themeGet } from '@styled-system/theme-get';
import CloseOutlinedIcon from '@material-ui/icons/CloseOutlined';
import { BlackButton } from 'components/UI';

export const ContentContainer = styled(Box)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 19px 6px 24px 19px;
  ${size};

  ${fujiMedia.lessThan('small')`
    padding: 40px 28px 32px;
  `}
  ${fujiMedia.between('small', 'medium')`
    padding: 40px 32px 40px;
  `}
`;

export const StyledModal = Modal.styled`
  display: flex;
  position: relative;
  align-items: center;
  width: 50rem;
  height: 31.25rem;
  border-radius: 12px;
  background-color: ${props => props.backgroundColor || 'white'};
  transition : all 0.3s ease-in-out;
  color: ${themeGet('colors.text64')};
  flex-direction: column;
  opacity: ${props => props.opacity};


  ${padding};
  ${color};
  
  ${fujiMedia.lessThan('small')`
    width: 100%;
    height: 100%;
    border-radius: 0px;
    justify-content: space-between;
  `};

  animation: zoomIn;
  animation-duration: .6s;
`;

export const OpacityImage = styled(Image)`
  position: absolute;
  opacity: 0.08;
  left: 0;
  top: 0;
  z-index: 0;
`;

export const CloseButton = styled(CloseOutlinedIcon)`
  position: absolute;
  right: 32px;
  top: 32px;
  width: 24px;
  height: 24px;

  cursor: pointer;
`;

export const IntroPanel = styled.video`
  position: absolute;
  border-radius: 12px;
  width: 200px;
  height: 200px;

  z-index: 1;
  ${space};
  ${height};
  ${width};
`;

export const PanelContainer = styled.div`
  width: 230px;
  height: 230px;
  background: ${props => props.backgroundColor};
  mix-blend-mode: normal;
  border-radius: 50%;
  filter: blur(10px);
  z-index: 0;
`;

export const SkipButton = styled.button`
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  color: white;
  font-size: 1rem;
  z-index: 1;

  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  cursor: pointer;

  background: transparent;
  transition: 0.3s background;
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

export const OpenButton = styled(BlackButton)`
  &:hover {
    animation: pulse;
    animation-duration: 0.5s;
  }
`;

export const AmountInput = styled.input`
  width: 2rem;
  margin: 0 8px;
  text-align: center;
  height: 1.5rem;
  background-color: inherit;
  border: 1px solid ${({ theme }) => theme.buttonColor};
  color: ${({ theme }) => theme.foreColor};
  border-radius: 3px;
`;
