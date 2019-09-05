import React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';
import uuid from 'uuid/v4';

const StyledTooltip = styled(ReactTooltip)`
  max-width: 320px;
  z-index: 1000000;
  opacity: 0.96 !important;
  border-radius: 8px;
  box-shadow: 0px 3px 6px 1px rgba(20, 20, 20, 0.08);
  padding: 16px;
  font-size: 12px;

  &.type-light {
    background: white;
    color: ${props => props.theme.colors.black[700]};
    border: 1px solid rgba(20, 20, 20, 0.08);
  }
`;

const InlineDiv = styled.div`
  display: inline-block;
  cursor: help;
`;

/**
 * A tooltip to show overlays on hover.
 *
 * Relies on [react-tooltip](https://react-tooltip.netlify.com/) and accepts any
 * of its properties.
 */
class Tooltip extends React.Component {
  static propTypes = {
    /** A unique identifier for this tooltip */
    id: PropTypes.string,
    /** Tooltip type */
    type: PropTypes.oneOf(['success', 'warning', 'error', 'info', 'light', 'dark']),
    /** Tooltip place */
    place: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
    /** The popup content */
    content: PropTypes.func,
    /** The trigger. Either:
     *  - A render func, that gets passed props to set on the trigger
     *  - A React node, rendered inside an inline-div
     */
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  };

  static defaultProps = {
    type: 'dark',
    place: 'top',
  };

  constructor(props) {
    super(props);
    this.state = { id: `tooltip-${uuid()}`, isMounted: false };
  }

  componentDidMount() {
    this.setState({ isMounted: true });
  }

  renderContent() {
    const { content } = this.props;
    return typeof content === 'function' ? content() : content;
  }

  render() {
    const triggerProps = { 'data-for': this.state.id, 'data-tip': true };
    return (
      <React.Fragment>
        {typeof this.props.children === 'function' ? (
          this.props.children(triggerProps)
        ) : (
          <InlineDiv {...triggerProps}>{this.props.children}</InlineDiv>
        )}
        {this.state.isMounted && (
          <StyledTooltip
            id={this.state.id}
            effect="solid"
            delayHide={500}
            delayUpdate={500}
            place={this.props.place}
            type={this.props.type}
          >
            {this.renderContent()}
          </StyledTooltip>
        )}
      </React.Fragment>
    );
  }
}

export default Tooltip;
