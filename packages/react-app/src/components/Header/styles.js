import styled from 'styled-components';
import { size } from 'styled-system';
import { themeGet } from '@styled-system/theme-get';
import { Box } from 'rebass';
import { fujiMedia } from 'consts';

export const Container = styled(Box)`
  position: relative;
  z-index: 2;
`;

export const HeaderContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 100px;

  padding: 32px 28px;

  ${size}

  ${fujiMedia.lessThan('small')`
    height:64px;
    background-color: #272727;
    padding: 16px 28px;
  `}
  ${fujiMedia.between('small', 'medium')`
    padding: 16px 40px;
    background-color: #272727;
    height: 88px;
  `}
`;

export const Logo = styled.img`
  height: 100%;
  transition: all 250ms ease;
  &:hover {
    opacity: 0.8;
  }
  ${size}
`;

export const MenuBackContainer = styled(Box)`
  position: absolute;
  width: 100%;
  height: 100vh;
  top: 64px;
  padding-left: 30%;
  background: transparent;
  z-index: 9999;
  backdrop-filter: blur(0.25rem);
  ${fujiMedia.between('small', 'medium')`
    top: 88px;
    padding-left: 50%;
  `}
`;

export const MenuContainer = styled(Box)`
  height: 100vh;
  background: rgb(20, 20, 20);
  opacity: 0.97;
  z-index: 9998;
`;

export const MenuItem = styled(Box)`
  font-weight: 600;
  font-size: 24px;
  line-height: 36px;
  color: ${props => (props.isSelected ? '#f0014f' : '#f5f5fd')};
  margin: 16px 0px !important;
  &:hover {
    color: #f0014f;
  }
`;

export const MenuNavigationContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  bottom: 64px;
  height: 64px;
  width: calc(100% - 56px);
  left: 28px;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
  border-radius: 12px 12px 0px 0px;
  padding: 0px 24px;
  ${fujiMedia.between('small', 'medium')`
    height: 76px;
    bottom: 76px;
    padding: 0px 32px;
    width: calc(100% - 88px);
    left: 44px;
  `}
`;

export const Navigation = styled.ul`
  display: flex;
  justify-content: flex-end;

  li {
    margin-left: 2em;
    font-size: 0.875rem;

    &.nav-item {
      font-size: 1rem;
    }

    a {
      height: 40px;
      line-height: 40px;
      color: ${themeGet('colors.text.primary')};
      font-weight: 500;
      transition: all 250ms ease;
      text-shadow: 0rem 0rem 0.125rem ${themeGet('colors.text.primary')};

      &:hover {
        color: ${themeGet('colors.primary')};
        text-shadow: 0rem 0rem 0.125rem ${themeGet('colors.primary')};
      }

      &.current {
        color: ${themeGet('colors.primary')};
        text-shadow: 0rem 0rem 0.125rem ${themeGet('colors.primary')};
      }

      &.button-nav {
        display: block;
        width: 146px;
        text-align: center;
        cursor: pointer;
        line-height: 36px;
        border: 0.125rem solid ${themeGet('colors.primary')};
        border-radius: 2rem;
        transition: all 250ms ease;

        &.connected {
          border-color: ${themeGet('colors.text.link')};
          color: ${themeGet('colors.text.secondary')};
          text-shadow: 0rem 0rem 0rem transparent;
        }

        &:hover {
          color: ${themeGet('colors.text.primary')};
          border-color: ${themeGet('colors.text.secondary')};
        }
      }
    }
  }
  ${fujiMedia.lessThan('small')`
    display:none
  `}
`;

export const BallanceContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 36px;
  cursor: default;
  padding-left: ${props => (props.leftPadding !== undefined ? props.leftPadding : 16)}px;
  padding-right: ${props => (props.rightPadding !== undefined ? props.rightPadding : 16)}px;

  background: rgba(255, 255, 255, 0.05);
  box-sizing: border-box;
  border-radius: 19px;

  font-size: 12px;
  color: #f5f5f5;

  ${size}
`;

export const DropDownHeader = styled(Box)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 36px;
  color: #f5f5f5;
  box-sizing: border-box;
  border-radius: 19px;
  cursor: pointer;
  padding-left: ${props => (props.leftPadding !== undefined ? props.leftPadding : 16)}px;
  padding-right: ${props => (props.rightPadding !== undefined ? props.rightPadding : 16)}px;

  background: ${props =>
    props.isClicked
      ? 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.07) 100%)'
      : 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid
    ${props =>
      props.isClicked
        ? themeGet('colors.primary')
        : props.hasBorder
        ? 'rgba(255, 255, 255, 0.1)'
        : 'transparent'};

  &:hover {
    background: ${props =>
      props.isClicked
        ? 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.07) 100%)'
        : 'rgba(255, 255, 255, 0.15)'};
    border: 1px solid
      ${props => (props.isClicked ? themeGet('colors.primary') : 'rgba(255, 255, 255, 0.1)')};
  }
  ${size}
`;

export const DropDownBackContainer = styled(Box)`
  position: absolute;
  width: 100vw;
  height: 100vh;
  left: 50%;
  transform: translateX(-50%);
  ${fujiMedia.lessThan('small')`
    position: fixed;
    width: 100vw;
    top: 64px;
    backdrop-filter: blur(0.25rem);
  `}
  ${fujiMedia.between('small', 'medium')`
    position: fixed;
    width: 496px !important;
    top: 64px;
    backdrop-filter: blur(0.25rem);
  `}
`;

export const DropDownItemContainer = styled(Box)`
  position: absolute;
  width: max-content;
  left: 50%;
  transform: translateX(-50%);
  border: none;
  box-sizing: border-box;
  color: #3faffa;
  background-color: #1c1c1c;

  ${fujiMedia.lessThan('small')`
    width: 100vw;
    border-bottom: 1px solid ${themeGet('colors.primary')};
    color: #3faffa;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  `}
  ${fujiMedia.between('small', 'medium')`
    width: 496px !important;
    border: 1px solid ${themeGet('colors.primary')};
    border-top: none;
    color: #3faffa;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  `}
`;

export const DropDownItem = styled(Box)`
  height: 36px;
  font-weight: 500;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 16px 0px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: ${themeGet('colors.text64')};
  &:hover {
    color: #f5f5f5;
    background-color: rgba(255, 255, 255, 0.1);
  }
  &:last-child {
    border-bottom: none;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  cursor: pointer;
`;
