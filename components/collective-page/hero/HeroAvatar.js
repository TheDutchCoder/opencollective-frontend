import React from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import styled, { css } from 'styled-components';
import { FormattedMessage } from 'react-intl';
import { Mutation } from 'react-apollo';

import { Camera } from 'styled-icons/feather/Camera';

import { upload } from '../../../lib/api';
import { getAvatarBorderRadius } from '../../../lib/utils';
import Avatar from '../../Avatar';
import LoadingPlaceholder from '../../LoadingPlaceholder';
import StyledRoundButton from '../../StyledRoundButton';
import StyledButton from '../../StyledButton';
import Container from '../../Container';
import { EditAvatarMutation } from '../graphql/mutations';

const AVATAR_SIZE = 128;

// Dynamically import components for admins
const DropzoneLoadingPlaceholder = () => (
  <LoadingPlaceholder height={AVATAR_SIZE} width={AVATAR_SIZE} color="primary.500" borderRadius="25%" />
);
const dynamicParams = { loading: DropzoneLoadingPlaceholder, ssr: false };
const Dropzone = dynamic(() => import(/* webpackChunkName: 'react-dropzone' */ 'react-dropzone'), dynamicParams);

const EditOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  text-align: center;
  padding: 1em;
  border-radius: ${props => props.borderRadius};
`;

const EditableAvatarContainer = styled.div`
  position: relative;

  ${props =>
    !props.isDragActive &&
    css`
      &:not(:hover) ${EditOverlay} {
        visibility: hidden;
      }
    `}
`;

const EditingAvatarContainer = styled.div`
  width: 128px;
  height: 128px;
  border: 2px dashed lightgrey;
  border-radius: ${props => props.borderRadius};
  clip-path: inset(0 0 0 0 round ${props => props.borderRadius});
  img {
    width: 100%;
    height: 100%;
  }
`;

const Triangle = styled.div`
  position: absolute;
  font-size: 42px;
  top: -45px;
  left: 42px;
  color: white;
  text-shadow: -2px -3px 4px rgba(121, 121, 121, 0.5);
`;

const HeroAvatar = ({ collective, isAdmin }) => {
  const [editing, setEditing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadedImage, setUploadedImage] = React.useState(null);
  const borderRadius = getAvatarBorderRadius(collective.type);

  if (!isAdmin) {
    return <Avatar collective={collective} radius={AVATAR_SIZE} />;
  } else if (!editing) {
    return (
      <Dropzone
        style={{}}
        multiple={false}
        accept="image/jpeg, image/png"
        disabled={submitting}
        onDrop={acceptedFiles => {
          setUploadedImage(acceptedFiles[0]);
          setEditing(true);
        }}
      >
        {({ isDragActive, isDragAccept }) => (
          <EditableAvatarContainer isDragActive={isDragActive}>
            <EditOverlay borderRadius={borderRadius}>
              {!isDragActive && (
                <React.Fragment>
                  <StyledRoundButton backgroundColor="#297EFF" color="white.full" size={40} mb={2}>
                    <Camera size={25} />
                  </StyledRoundButton>
                  <FormattedMessage id="HeroAvatar.Edit" defaultMessage="Edit logo" />
                </React.Fragment>
              )}
              {isDragActive &&
                (isDragAccept ? (
                  <FormattedMessage id="uploadImage.isDragActive" defaultMessage="Drop it like it's hot 🔥" />
                ) : (
                  <FormattedMessage id="uploadImage.isDragReject" defaultMessage="🚫 This file type is not accepted" />
                ))}
            </EditOverlay>
            <Avatar collective={collective} radius={AVATAR_SIZE} />
          </EditableAvatarContainer>
        )}
      </Dropzone>
    );
  } else {
    return uploadedImage || collective.imageUrl ? (
      <Mutation mutation={EditAvatarMutation}>
        {editAvatar => (
          <div>
            <EditingAvatarContainer borderRadius={borderRadius}>
              <img src={uploadedImage ? uploadedImage.preview : collective.imageUrl} alt="" />
            </EditingAvatarContainer>
            <Container
              position="absolute"
              display="flex"
              mt={2}
              p={2}
              zIndex={2}
              background="white"
              boxShadow="0px 3px 5px -2px #777777"
            >
              <Triangle>▲</Triangle>
              <StyledButton
                textTransform="capitalize"
                minWidth={150}
                disabled={submitting}
                onClick={() => {
                  setUploadedImage(null);
                  setEditing(false);
                }}
              >
                <FormattedMessage id="form.cancel" defaultMessage="cancel" />
              </StyledButton>
              <StyledButton
                textTransform="capitalize"
                buttonStyle="primary"
                ml={3}
                minWidth={150}
                loading={submitting}
                onClick={async () => {
                  setSubmitting(true); // Need this because `upload` is not a graphql function

                  try {
                    // Upload image if changed or remove it
                    let imgURL = collective.imageUrl || collective.image;
                    if (uploadedImage) {
                      imgURL = await upload(uploadedImage);
                    }

                    // Update settings
                    await editAvatar({ variables: { id: collective.id, image: imgURL } });

                    // Reset
                    setUploadedImage(null);
                    setEditing(false);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <FormattedMessage id="save" defaultMessage="save" />
              </StyledButton>
            </Container>
          </div>
        )}
      </Mutation>
    ) : (
      <Avatar collective={collective} radius={AVATAR_SIZE} />
    );
  }
};

HeroAvatar.propTypes = {
  collective: PropTypes.shape({
    type: PropTypes.string,
    image: PropTypes.string,
    imageUrl: PropTypes.string,
  }).isRequired,
  isAdmin: PropTypes.bool,
};

export default HeroAvatar;
