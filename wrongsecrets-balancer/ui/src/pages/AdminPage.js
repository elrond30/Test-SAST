import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import DataTable, { createTheme } from 'react-data-table-component';
import { FormattedRelativeTime, defineMessages, useIntl, FormattedMessage } from 'react-intl';
import { selectUnit } from '@formatjs/intl-utils';

import { BodyCard, SecondaryButton } from '../Components';

// create react-data-table theme
createTheme('multijuicer', {
  text: {
    primary: 'var(--font-color)',
    secondary: 'var(--font-color-highlight)',
  },
  sortFocus: {
    default: 'var(--font-color-highlight)',
  },
  highlightOnHover: {
    default: 'var(--font-color-highlight)',
    text: 'var(--font-color-highlight)',
  },
  background: {
    default: 'var(--background-color)',
  },
  context: {
    background: '#cb4b16',
    text: '#FFFFFF',
  },
  divider: {
    default: '#073642',
  },
  action: {
    button: 'rgba(0,0,0,.54)',
    hover: 'rgba(0,0,0,.08)',
    disabled: 'rgba(0,0,0,.12)',
  },
});

const SmallSecondary = styled(SecondaryButton)`
  padding: 8px;
  min-width: 70px;
`;

const WarnSmallSecondary = styled(SmallSecondary)`
  padding: 8px;
  min-width: 70px;
  background-color: #ef4444;
  color: var(--font-color);
`;

const BigBodyCard = styled(BodyCard)`
  width: 70vw;
  max-width: initial;
`;

const Text = styled.span`
  color: var(--font-color);
`;

const messages = defineMessages({
  tableHeader: {
    id: 'admin_table.table_header',
    defaultMessage: 'Active Teams',
  },
  teamname: {
    id: 'admin_table.teamname',
    defaultMessage: 'Teamname',
  },
  name: {
    id: 'admin_table.name',
    defaultMessage: 'Name',
  },
  ready: {
    id: 'admin_table.ready',
    defaultMessage: 'Ready',
  },
  created: {
    id: 'admin_table.created',
    defaultMessage: 'Created',
  },
  lastUsed: {
    id: 'admin_table.lastUsed',
    defaultMessage: 'Last Used',
  },
  actions: {
    id: 'admin_table.actions',
    defaultMessage: 'Actions',
  },
  noContent: {
    id: 'admin_table.noActiveTeams',
    defaultMessage: 'No active teams',
  },
});

function RestartInstanceButton({ team }) {
  const [restarting, setRestarting] = useState(false);

  const restart = async (event) => {
    event.preventDefault();
    setRestarting(true);
    try {
      await fetch(`/balancer/admin/teams/${team}/restart`, {
        method: 'POST',
      });
    } finally {
      setRestarting(false);
    }
  };
  return (
    <SmallSecondary onClick={restart}>
      {restarting ? (
        <FormattedMessage id="admin_table.restarting" defaultMessage="Restarting..." />
      ) : (
        <FormattedMessage id="admin_table.restart" defaultMessage="Restart-WS" />
      )}
    </SmallSecondary>
  );
}

function RestartDesktopInstanceButton({ team }) {
  const [restarting, setRestarting] = useState(false);

  const restart = async (event) => {
    event.preventDefault();
    setRestarting(true);
    try {
      await fetch(`/balancer/admin/teams/${team}/restartdesktop`, {
        method: 'POST',
      });
    } finally {
      setRestarting(false);
    }
  };
  return (
    <SmallSecondary onClick={restart}>
      {restarting ? (
        <FormattedMessage id="admin_table.restarting" defaultMessage="Restarting..." />
      ) : (
        <FormattedMessage id="admin_table.restart" defaultMessage="Restart-VD" />
      )}
    </SmallSecondary>
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function DeleteInstanceButton({ team }) {
  const [deleting, setDeleting] = useState(false);

  const remove = async (event) => {
    event.preventDefault();
    setDeleting(true);

    try {
      await Promise.all([
        sleep(3000),
        fetch(`/balancer/admin/teams/${team}/delete`, {
          method: 'DELETE',
        }),
      ]);
    } finally {
      setDeleting(false);
    }
  };
  return (
    <WarnSmallSecondary onClick={remove}>
      {deleting ? (
        <FormattedMessage id="admin_table.deleting" defaultMessage="Deleting..." />
      ) : (
        <FormattedMessage id="admin_table.delete" defaultMessage="Delete" />
      )}
    </WarnSmallSecondary>
  );
}

export default function AdminPage() {
  const [teams, setTeams] = useState([]);
  const { formatMessage, formatDate } = useIntl();

  async function updateAdminData() {
    try {
      const response = await fetch(`/balancer/admin/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch current teams');
      }
      const data = await response.json();
      setTeams(data.instances);
    } catch (err) {
      console.error('Failed to fetch current teams!', err);
    }
  }

  useEffect(() => {
    updateAdminData();

    const interval = setInterval(updateAdminData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const columns = [
    {
      name: formatMessage(messages.teamname),
      selector: row => row.team,
      sortable: true,
    },
    {
      name: formatMessage(messages.name),
      selector: row => row.name,
      sortable: true,
    },
    {
      name: formatMessage(messages.ready),
      selector: row => row.ready,
      sortable: true,
      right: true,
      // ready is just a emoji, so the colum can shrink
      grow: 0,
      format: ({ ready }) => (ready ? '✅' : '❌'),
    },
    {
      name: formatMessage(messages.created),
      selector: row => row.createdAt,
      sortable: true,
      format: ({ createdAt }) => {
        const { value, unit } = selectUnit(createdAt);
        return (
          <Text title={createdAt}>
            <FormattedRelativeTime value={value} unit={unit} />
          </Text>
        );
      },
    },
    {
      name: formatMessage(messages.lastUsed),
      selector: row => row.lastConnect,
      sortable: true,
      format: ({ lastConnect }) => {
        const { value, unit } = selectUnit(lastConnect);
        return (
          <Text title={formatDate(lastConnect)}>
            <FormattedRelativeTime value={value} unit={unit} />
          </Text>
        );
      },
    },
    {
      name: formatMessage(messages.actions),
      selector: row => row.actions,
      right: true,
      cell: ({ team }) => {
        return (
          <>
            <DeleteInstanceButton team={team} />
            <br />
            <RestartInstanceButton team={team} />
            <br />
            <RestartDesktopInstanceButton team={team} />
          </>
        );
      },
      ignoreRowClick: true,
      button: true,
      minWidth: '200px',
    },
  ];

  return (
    <BigBodyCard>
      <DataTable
        theme="multijuicer"
        title={formatMessage(messages.tableHeader)}
        noDataComponent={formatMessage(messages.noContent)}
        defaultSortField="lastConnect"
        defaultSortAsc={false}
        columns={columns}
        data={teams}
        keyField="team"
      />
    </BigBodyCard>
  );
}
