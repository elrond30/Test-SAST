import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

import { BodyCard, CenteredCard, Button } from '../Components';
import { Spinner } from '../Spinner';

const LinkButton = styled(Button).attrs({ as: 'a' })``;;

const CenteredText = styled.span`
  text-align: center;
  display: block;
`;

export const InstanceRestartingCard = ({ teamname }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    axios
      .get(`/balancer/teams/${teamname}/wait-till-ready`, {
        // Wait at most 3 minutes before timing out
        timeout: 3 * 60 * 1000,
      })
      .then(() => {
        setReady(true);
      })
      .catch(() => {
        console.error('Failed to wait for deployment readiness');
      });
  }, [teamname]);

  if (ready) {
    return (
      <BodyCard>
        <CenteredText>
          <span role="img" aria-label="Done">
            ✅
          </span>{' '}
          <span data-test-id="instance-status">
            <FormattedMessage
              id="instance_status_restarted"
              defaultMessage="Wrongsecrets Instance ready again"
            />
          </span>
        </CenteredText>
        <LinkButton data-test-id="start-hacking-button" href="/" target="_blank">
          <FormattedMessage
            id="instance_status_back_to_hacking"
            defaultMessage="Get back to Hacking"
          />
        </LinkButton>
        <LinkButton data-test-id="start-desktop-button" href="/?desktop" target="_blank">
          <FormattedMessage
            id="instance_status_start_vm"
            defaultMessage="Start your Webtop, might require refresh"
          />
        </LinkButton>
      </BodyCard>
    );
  } else {
    return (
      <CenteredCard>
        <Spinner />
        <span data-test-id="instance-status">
          <FormattedMessage
            id="instance_status_restarting"
            defaultMessage="Wrongssecrets Instance is currently restarting. It should be ready in a couple of seconds."
          />
        </span>
      </CenteredCard>
    );
  }
};
