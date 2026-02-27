/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useEffect, useState } from 'react';
import { SnackbarProvider } from 'notistack';
import { makeStyles } from '@material-ui/styles';
import { AuthContext, AuthContextValue } from '@logrhythm/nm-web-shared/contexts/auth_context';
import {
  BlockingProcessContext,
  BlockingProcessContextValue,
} from '@logrhythm/nm-web-shared/contexts/blocking_process_context';
import { Navbar } from '@logrhythm/nm-web-shared/components/navigation/navbar/navbar';
import { useSessionSync } from '@logrhythm/nm-web-shared/hooks/session_sync_hooks';
import NotificationHandler from './notification_handler';

/* eslint-disable @typescript-eslint/no-var-requires */
const AuthService = require('@logrhythm/nm-web-shared/services/auth').default;
const BlockingProcessModal =
  require('@logrhythm/nm-web-shared/components/blocking_process/blocking_process_modal').default;
/* eslint-enable @typescript-eslint/no-var-requires */

const useStyles = makeStyles(
  {
    snackbar: {
      maxWidth: '20vw',
      '& > div': {
        borderRadius: 0,
        font: '400 100%/1.4 Ubuntu,Tahoma,sans-serif',
        flexWrap: 'nowrap',
      },
      '& > div > div:first-child': {
        width: '100%',
      },
      '& a': {
        textDecoration: 'underline !important',
      },
    },
  },
  { name: 'Navbar' }
);

const LogRhythmNavbar = () => {
  const classes = useStyles();
  const [authState, setAuthState] = useState<AuthContextValue | undefined>(undefined);

  // Always call hooks in the same order - handle errors in useEffect
  const checkingToken = useSessionSync('token');
  const checkingNotifications = useSessionSync('notificationsAlreadySeen');

  const [blockingProcessMsg, setBlockingProcessMsg] = useState<string>('');
  const blockingProcessContextState: BlockingProcessContextValue = {
    message: blockingProcessMsg,
    block: setBlockingProcessMsg,
    unblock: () => setBlockingProcessMsg(''),
  };

  useEffect(() => {
    // Apply LogRhythm 7.5.2 compatible styling
    document.body.classList.add('logrhythm-theme', 'kibana-7-5-2-compat');

    if (checkingToken || checkingNotifications) {
      return;
    }

    try {
      const unsub = AuthService.subscribe((newAuthState: AuthContextValue) => {
        setAuthState(newAuthState);
      });

      AuthService.getCurrentUser();
      return unsub;
    } catch (authError) {
      // Handle auth error silently and set default state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: async () => Promise.resolve(),
        logout: async () => Promise.resolve(),
      } as AuthContextValue);
    }

    // Cleanup function
    return () => {
      document.body.classList.remove('logrhythm-theme', 'kibana-7-5-2-compat');
    };
  }, [checkingToken, checkingNotifications]);

  if (authState === undefined) {
    return null;
  }

  return (
    <AuthContext.Provider value={[authState, setAuthState]}>
      <BlockingProcessContext.Provider value={blockingProcessContextState}>
        <SnackbarProvider
          maxSnack={7}
          classes={{ root: classes.snackbar }}
          autoHideDuration={3000}
          hideIconVariant={true}
        >
          <Navbar />
          <NotificationHandler />
          {React.createElement(BlockingProcessModal, {
            isOpen: !!blockingProcessMsg,
            message: blockingProcessMsg,
          })}
        </SnackbarProvider>
      </BlockingProcessContext.Provider>
    </AuthContext.Provider>
  );
};

export { LogRhythmNavbar };
