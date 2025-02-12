import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { get, pick, difference } from 'lodash';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { isURL } from 'validator';
import { Close } from 'styled-icons/material/Close';
import memoizeOne from 'memoize-one';

import events from '../lib/constants/notificationEvents';

import { compose } from '../lib/utils';
import { CollectiveType } from '../lib/constants/collectives';

import Loading from './Loading';
import { Span } from './Text';
import StyledHr from './StyledHr';
import MessageBox from './MessageBox';
import { Flex, Box } from '@rebass/grid';
import StyledButton from './StyledButton';
import StyledSelect from './DeprecatedStyledSelect';
import { Add } from 'styled-icons/material/Add';
import StyledInputGroup from './StyledInputGroup';
import ExternalLinkNewTab from './ExternalLinkNewTab';

const messages = defineMessages({
  'webhooks.url.label': {
    id: 'webhooks.url.label',
    defaultMessage: 'URL',
  },
  'webhooks.types.label': {
    id: 'webhooks.types.label',
    defaultMessage: 'Activity',
  },
  'webhooks.add': {
    id: 'webhooks.add',
    defaultMessage: 'Add another webhook',
  },
  'webhooks.remove': {
    id: 'webhooks.remove',
    defaultMessage: 'Remove webhook',
  },
  'webhooks.save': {
    id: 'webhooks.save',
    defaultMessage: 'Save {count} webhooks',
  },
});

class EditWebhooks extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    collectiveSlug: PropTypes.string.isRequired,
    editWebhooks: PropTypes.func,
    /** From graphql query */
    data: PropTypes.object.isRequired,
    /** From intl */
    intl: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      modified: false,
      webhooks: this.getWebhooksFromProps(props),
      isLoaded: false,
      status: null,
      error: '',
    };
  }

  componentDidUpdate(oldProps) {
    if (this.getWebhooksFromProps(oldProps) !== this.getWebhooksFromProps(this.props)) {
      this.setState({ webhooks: this.getWebhooksFromProps(this.props) });
    }
  }

  getWebhooksFromProps = props => {
    return get(props, 'data.Collective.notifications', []);
  };

  validateWebhookUrl = value => {
    return isURL(value);
  };

  cleanWebhookUrl = value => {
    return value ? value.trim().replace(/https?:\/\//, '') : '';
  };

  getEventTypes = memoizeOne((collectiveType, isHost) => {
    const removeList = [];

    if (collectiveType !== CollectiveType.COLLECTIVE) {
      removeList.push(
        'collective.comment.created',
        'collective.expense.created',
        'collective.expense.deleted',
        'collective.expense.updated',
        'collective.expense.rejected',
        'collective.expense.approved',
        'collective.expense.paid',
        'collective.monthly',
        'collective.transaction.created',
        'collective.transaction.paid',
        'collective.update.created',
        'collective.update.published',
      );
    }
    if (collectiveType !== CollectiveType.ORGANIZATION) {
      removeList.push('organization.collective.created', 'user.created');
    }
    if (collectiveType !== CollectiveType.EVENT) {
      removeList.push('ticket.confirmed');
    }
    if (!isHost) {
      removeList.push('collective.apply', 'collective.approved', 'collective.created');
    }

    return difference(events, removeList);
  });

  editWebhook = (index, fieldname, value) => {
    const { webhooks, status } = this.state;
    let newStatus = status;

    if (fieldname === 'webhookUrl') {
      const cleanValue = this.cleanWebhookUrl(value);
      webhooks[index][fieldname] = cleanValue;
      const isValid = webhooks.every(webhook => this.validateWebhookUrl(webhook.webhookUrl));
      newStatus = isValid ? null : 'invalid';
    } else {
      webhooks[index][fieldname] = value;
    }
    this.setState({ webhooks, modified: true, status: newStatus });
  };

  addWebhook = () => {
    const { webhooks } = this.state;
    webhooks.push({ webhookUrl: '', type: 'all' });
    this.setState({ webhooks, modified: true });
  };

  removeWebhook = index => {
    const { webhooks } = this.state;
    if (index < 0 || index > webhooks.length) return;
    webhooks.splice(index, 1);
    this.setState({ webhooks, modified: true });
  };

  handleSubmit = async () => {
    this.setState({ status: 'loading' });
    const { webhooks } = this.state;
    const notifications = webhooks.map(webhook => pick(webhook, ['type', 'webhookUrl', 'id']));

    try {
      await this.props.editWebhooks({ collectiveId: this.props.data.Collective.id, notifications });
      this.setState({ modified: false, status: 'saved' });
      setTimeout(() => {
        this.setState({ status: null });
      }, 3000);
    } catch (e) {
      let message = '';
      if (e && e.errors) {
        message = e.errors[0].message;
      } else if (e && e.graphQLErrors && e.graphQLErrors.length > 0) {
        message = e.graphQLErrors[0].message;
      } else {
        message = e.message;
      }
      this.setState({ status: 'error', error: message });
    }
  };

  renderWebhook = (webhook, index) => {
    const { intl, data } = this.props;

    return (
      <Flex
        py={4}
        key={index}
        width={[0.9, 1]}
        mx={['auto', 0]}
        px={[0, 3, 0]}
        flexWrap="wrap"
        flexDirection="row-reverse"
        justifyContent="space-between"
      >
        <Box my={[0, 4]}>
          <StyledButton
            width={1}
            py={1}
            px={3}
            buttonSize="small"
            buttonStyle="standard"
            onClick={() => this.removeWebhook(index)}
          >
            <Close size="1.2em" />
            {'  '}
            {intl.formatMessage(messages['webhooks.remove'])}
          </StyledButton>
        </Box>

        <Box width={[1, 0.75]}>
          <Box mb={4}>
            <Span fontSize="Paragraph" mb={1}>
              {intl.formatMessage(messages['webhooks.url.label'])}
            </Span>
            <Span fontSize="3rem" color="#D7D9E0" css={'transform: translate(-60px, 23px); position: absolute;'}>
              {index + 1}
            </Span>
            <StyledInputGroup
              type="type"
              name="webhookUrl"
              prepend="https://"
              error={!this.validateWebhookUrl(webhook.webhookUrl)}
              value={this.cleanWebhookUrl(webhook.webhookUrl)}
              onChange={({ target }) => this.editWebhook(index, 'webhookUrl', target.value)}
            />
          </Box>
          <Box>
            <Span fontSize="Paragraph">{intl.formatMessage(messages['webhooks.types.label'])}</Span>
            <StyledSelect
              options={this.getEventTypes(data.Collective.type, data.Collective.isHost)}
              value={webhook.type}
              onChange={({ value }) => this.editWebhook(index, 'type', value)}
            />
          </Box>
        </Box>
      </Flex>
    );
  };

  render() {
    const { webhooks, status, error } = this.state;
    const { intl, data } = this.props;
    const webhooksCount = webhooks.length;

    if (data.loading) {
      return <Loading />;
    }

    return (
      <div>
        <h2>{this.props.title}</h2>
        <StyledHr />

        <MessageBox type="warning" mt={4} boxShadow="0px 5px 10px -5px" fontWeight="500">
          <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <span>
              🎆{' '}
              <FormattedMessage
                id="EditWebhooks.ZapierAd"
                defaultMessage="NEW! You can now use the Beta {zapierLink} app to manage your integrations."
                values={{
                  zapierLink: (
                    <ExternalLinkNewTab href="https://zapier.com/developer/public-invite/21484/63399c65bb01d75e00fe091ae7f58683/">
                      Zapier
                    </ExternalLinkNewTab>
                  ),
                }}
              />
            </span>
            <svg width={125} height={50} viewBox="0 0 500 229">
              <title>{'zapier-logo'}</title>
              <path
                d="M300.033 99.59H287.57c-.256-1.02-.447-2.203-.574-3.546a40.666 40.666 0 010-7.86c.127-1.34.318-2.522.574-3.548h31.06v98.353a46.42 46.42 0 01-4.697.572 65.11 65.11 0 01-4.7.19 62.93 62.93 0 01-4.502-.19 46.28 46.28 0 01-4.695-.575v-83.4.002zm108.127 24.734c0-3.58-.48-6.998-1.436-10.26-.96-3.257-2.37-6.1-4.218-8.53-1.857-2.426-4.22-4.377-7.096-5.846-2.875-1.47-6.295-2.206-10.257-2.206-7.796 0-13.772 2.368-17.925 7.095-4.154 4.728-6.677 11.31-7.573 19.747h48.506zm-48.696 14.186c.256 10.736 3.036 18.598 8.34 23.58 5.302 4.984 13.132 7.48 23.485 7.48 9.072 0 17.7-1.6 25.88-4.795 1.02 1.917 1.85 4.25 2.49 6.998a45.63 45.63 0 011.15 8.147c-4.215 1.794-8.852 3.13-13.897 4.027-5.052.892-10.643 1.342-16.774 1.342-8.95 0-16.62-1.25-23.007-3.74-6.392-2.495-11.664-6.01-15.818-10.545-4.153-4.536-7.19-9.905-9.107-16.105-1.916-6.197-2.877-13.004-2.877-20.417 0-7.285.926-14.092 2.78-20.42 1.85-6.323 4.7-11.82 8.53-16.485 3.836-4.667 8.66-8.372 14.476-11.12 5.813-2.748 12.682-4.124 20.61-4.124 6.773 0 12.716 1.152 17.83 3.452 5.11 2.3 9.393 5.464 12.845 9.49 3.45 4.027 6.07 8.82 7.86 14.377 1.788 5.562 2.686 11.6 2.686 18.12 0 1.79-.068 3.674-.195 5.654a192.677 192.677 0 01-.382 5.08H359.46l.002.003zm88.39-53.874a53.58 53.58 0 014.026-.574c1.275-.125 2.62-.19 4.026-.19 1.406 0 2.81.065 4.218.19 1.405.13 2.684.322 3.835.574.38 1.918.764 4.445 1.146 7.573.383 3.132.578 5.782.578 7.956 2.683-4.344 6.23-8.117 10.638-11.313 4.41-3.193 10.065-4.793 16.966-4.793 1.022 0 2.076.034 3.163.098.93.05 1.86.144 2.78.285.254 1.152.45 2.368.576 3.644.126 1.277.19 2.62.19 4.025 0 1.535-.095 3.134-.286 4.792a99.303 99.303 0 01-.67 4.792 13.208 13.208 0 00-3.165-.383h-2.59c-3.45 0-6.742.48-9.873 1.437-3.134.96-5.944 2.654-8.436 5.08-2.49 2.43-4.473 5.754-5.94 9.972-1.473 4.218-2.206 9.65-2.206 16.295v48.89c-1.555.27-3.123.463-4.698.574-1.723.128-3.29.19-4.695.19a64.51 64.51 0 01-4.698-.19 55.9 55.9 0 01-4.89-.573v-98.35zM313.3 32.12a19.054 19.054 0 01-1.223 6.718 19.08 19.08 0 01-6.72 1.224h-.028a19.06 19.06 0 01-6.72-1.223 19.035 19.035 0 01-1.225-6.72v-.03c0-2.365.434-4.63 1.22-6.72a19.018 19.018 0 016.722-1.223h.026c2.366 0 4.63.434 6.72 1.223a19.023 19.023 0 011.223 6.72v.03h.003zm23.426-5.32H318.15l13.134-13.135a31.954 31.954 0 00-7.502-7.5L310.646 19.3V.723A31.976 31.976 0 00305.36.28h-.034c-1.802 0-3.567.154-5.287.443V19.3L286.9 6.164a31.78 31.78 0 00-4.06 3.436l-.006.006a32.025 32.025 0 00-3.433 4.06L292.54 26.8h-18.58s-.442 3.49-.442 5.294v.022c0 1.804.153 3.572.443 5.293h18.58L279.4 50.542a32.05 32.05 0 007.503 7.502L300.04 44.91v18.578c1.718.288 3.48.44 5.28.442h.045a32.11 32.11 0 005.28-.442V44.91l13.138 13.137a32.072 32.072 0 004.063-3.436h.003a32.135 32.135 0 003.432-4.063L318.147 37.41h18.58c.288-1.72.44-3.482.44-5.282v-.046c0-1.77-.148-3.535-.44-5.28V26.8zM0 180.306l51.764-80.524H6.134c-.382-2.3-.573-4.854-.573-7.667 0-2.683.194-5.178.577-7.48h73.81l.96 2.497-52.147 80.712h48.886c.383 2.557.576 5.175.576 7.858 0 2.56-.192 4.987-.575 7.287H.96L0 180.303zm149.346-43.523c-1.917-.253-4.346-.506-7.285-.765-2.94-.253-5.432-.383-7.474-.383-7.926 0-13.965 1.47-18.116 4.41-4.157 2.942-6.23 7.413-6.23 13.42 0 3.834.7 6.838 2.107 9.01 1.404 2.176 3.163 3.834 5.272 4.985 2.11 1.15 4.44 1.854 6.995 2.11 2.555.255 4.985.382 7.285.382 2.94 0 5.975-.16 9.107-.48 3.13-.317 5.91-.798 8.34-1.437v-31.252zm0-18.594c0-7.544-1.917-12.784-5.75-15.724-3.836-2.94-9.395-4.41-16.68-4.41-4.477 0-8.66.354-12.557 1.056a96.073 96.073 0 00-11.41 2.777c-2.43-4.218-3.64-9.263-3.64-15.146 4.34-1.404 9.132-2.49 14.375-3.257 5.24-.768 10.288-1.152 15.147-1.152 12.78 0 22.493 2.91 29.14 8.725 6.644 5.82 9.97 15.117 9.97 27.896v61.542c-4.476 1.022-9.906 2.076-16.296 3.163a116.777 116.777 0 01-19.555 1.63c-6.262 0-11.92-.573-16.966-1.724-5.05-1.153-9.332-3.002-12.846-5.562-3.518-2.554-6.23-5.814-8.15-9.775-1.916-3.963-2.875-8.755-2.875-14.38 0-5.494 1.118-10.32 3.355-14.476a30.233 30.233 0 019.108-10.352c3.834-2.744 8.243-4.792 13.228-6.132 4.986-1.343 10.224-2.015 15.72-2.015 4.09 0 7.445.098 10.066.29 2.618.19 4.824.414 6.614.67v-3.643zm58.28 48.692a37.62 37.62 0 007.478 1.918c2.556.385 5.876.576 9.97.576 4.6 0 8.816-.733 12.65-2.203 3.836-1.467 7.126-3.738 9.874-6.807 2.748-3.066 4.92-6.93 6.518-11.6 1.597-4.662 2.398-10.188 2.398-16.582 0-10.224-1.888-18.34-5.656-24.348-3.773-6.006-9.94-9.01-18.5-9.01-3.195 0-6.265.574-9.2 1.726-2.944 1.15-5.562 2.876-7.863 5.176-2.3 2.3-4.153 5.21-5.558 8.724-1.41 3.518-2.11 7.7-2.11 12.558v39.875-.002zm-18.98-82.247c1.3-.256 2.61-.447 3.93-.574a44.67 44.67 0 014.123-.19c1.274 0 2.615.066 4.024.19 1.404.13 2.746.323 4.026.575.126.26.288 1.055.48 2.398.19 1.343.382 2.78.575 4.312.192 1.535.383 3.008.575 4.41.192 1.408.288 2.303.288 2.686 1.275-2.043 2.81-4.026 4.6-5.943 1.79-1.918 3.933-3.643 6.425-5.175 2.492-1.535 5.302-2.748 8.435-3.644 3.13-.894 6.613-1.345 10.448-1.345 5.75 0 11.087.96 16.01 2.878 4.918 1.92 9.133 4.887 12.65 8.914 3.513 4.027 6.26 9.14 8.243 15.337 1.98 6.204 2.97 13.52 2.97 21.954 0 16.87-4.57 30.07-13.71 39.59-9.14 9.523-22.077 14.282-38.82 14.282-2.813 0-5.687-.192-8.627-.575-2.942-.385-5.496-.897-7.67-1.533v45.054a55.71 55.71 0 01-4.886.575c-1.727.125-3.294.19-4.7.19a65.05 65.05 0 01-4.696-.19 46.31 46.31 0 01-4.696-.575v-143.6z"
                fill="#FF4A00"
              />
            </svg>
          </Flex>
        </MessageBox>

        <div>{webhooks.map(this.renderWebhook)}</div>

        {webhooksCount > 0 && <StyledHr />}

        <Box width={[0.9, 0.75]} mx={['auto', 0]} my={3}>
          <StyledButton
            width={[1]}
            px={[0, 3, 0]}
            borderRadius={6}
            buttonSize="medium"
            buttonStyle="standard"
            css={'border-style: dashed'}
            onClick={() => this.addWebhook()}
          >
            <Add size="1.2em" />
            {'  '}
            {intl.formatMessage(messages['webhooks.add'])}
          </StyledButton>
        </Box>

        {status === 'error' && (
          <Box my={3}>
            <MessageBox type="error">{error}</MessageBox>
          </Box>
        )}

        <Box mr={3}>
          <StyledButton
            px={4}
            buttonSize="medium"
            buttonStyle="primary"
            onClick={this.handleSubmit}
            loading={status == 'loading'}
            disabled={data.loading || !this.state.modified || status === 'invalid'}
          >
            {status === 'saved' ? (
              <Span textTransform="capitalize">
                <FormattedMessage id="saved" defaultMessage="saved" />
              </Span>
            ) : (
              <FormattedMessage
                id="webhooks.save"
                defaultMessage="Save {count} webhooks"
                values={{ count: webhooksCount }}
              />
            )}
          </StyledButton>
        </Box>
      </div>
    );
  }
}

const getCollectiveWithNotificationsQuery = gql`
  query CollectiveNotifications($collectiveSlug: String) {
    Collective(slug: $collectiveSlug) {
      id
      type
      slug
      isHost
      notifications(channel: "webhook") {
        id
        type
        active
        webhookUrl
      }
    }
  }
`;

const editWebhooks = graphql(
  gql`
    mutation editWebhooks($collectiveId: Int!, $notifications: [NotificationInputType]) {
      editWebhooks(collectiveId: $collectiveId, notifications: $notifications) {
        id
        type
        active
        webhookUrl
      }
    }
  `,
  {
    props: ({ mutate, ownProps }) => ({
      editWebhooks: variables =>
        mutate({
          variables,
          update: (cache, { data: { editWebhooks } }) => {
            const { Collective } = cache.readQuery({
              query: getCollectiveWithNotificationsQuery,
              variables: { collectiveSlug: ownProps.collectiveSlug },
            });
            cache.writeQuery({
              query: getCollectiveWithNotificationsQuery,
              data: { Collective: { ...Collective, notifications: editWebhooks } },
            });
          },
        }),
    }),
  },
);

const addData = compose(
  graphql(getCollectiveWithNotificationsQuery),
  editWebhooks,
);

export default injectIntl(addData(EditWebhooks));
