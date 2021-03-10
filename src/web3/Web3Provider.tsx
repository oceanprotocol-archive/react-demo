import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  createContext,
  ReactElement,
  ReactNode,
} from "react";

import Web3 from "web3";
import Web3Modal, { ICoreOptions } from "web3modal";

import { getDefaultProviders } from "./getDefaultProviders";
import Web3ProviderStatus from "./Web3ProviderStatus";

import { Logger, Config } from "@oceanprotocol/lib";
import { ConfigHelperConfig } from "@oceanprotocol/lib/dist/node/utils/ConfigHelper";

interface Web3ProviderValue {
  connect: () => Promise<void>;
  logout: () => Promise<void>;
  web3: Web3;
  web3Modal: Web3Modal;
  status: Web3ProviderStatus;
}

const Web3ProviderContext = createContext({} as Web3ProviderValue);

function Web3Provider({
  initialConfig,
  web3ModalOpts,
  children
}: {
  initialConfig: Config | ConfigHelperConfig
  web3ModalOpts?: Partial<ICoreOptions>
  children: ReactNode
}): ReactElement {
  const [web3, setWeb3] = useState<Web3 | undefined>();
  const [web3Modal, setWeb3Modal] = useState<Web3Modal>();
  const [web3Provider, setWeb3Provider] = useState<any | undefined>();
  const [config, setConfig] = useState<Config | ConfigHelperConfig>(
    initialConfig
  );
  const [status, setStatus] = useState<Web3ProviderStatus>(
    Web3ProviderStatus.NOT_AVAILABLE
  );

  const init = useCallback(async () => {
    Logger.log("Web3Provider init");

    window &&
      window.ethereum &&
      (window.ethereum.autoRefreshOnNetworkChange = false);

    Logger.log("Web3Modal init");

    const web3ModalInstance = new Web3Modal(
      web3ModalOpts || (await getDefaultProviders())
    );
    setWeb3Modal(web3ModalInstance);
    Logger.log("Web3Modal instance created: ", web3ModalInstance);
  }, [web3ModalOpts]);

  const connect = useCallback(
    async (newConfig?: Config | ConfigHelperConfig) => {
      try {
        Logger.log("Connecting... ", newConfig);
        newConfig && setConfig(newConfig);

        const provider = await web3Modal?.connect();
        setWeb3Provider(provider);

        const web3 = new Web3(provider);
        setWeb3(web3);

        config.web3Provider = web3;
        Logger.log("Web3 created: ", web3);

        const networkId = web3 && (await web3.eth.net.getId());
        Logger.log("Network id: ", networkId);

        setStatus(Web3ProviderStatus.CONNECTED);
      } catch (error) {
        Logger.error(error);
      }
    },
    [config, web3Modal]
  );

  async function logout() {
    web3Modal?.clearCachedProvider();
  }

  // On mount setup Web3Modal instance
  useEffect(() => {
    init();
  }, [init]);

  // Connected automatically to cached provider if present
  useEffect(() => {
    if (!web3Modal) return;
    web3Modal.cachedProvider && connect();
  }, [web3Modal, connect]);

  useEffect(() => {
    const handleAccountsChanged = async (accounts: string[]) => {
      Logger.debug("Handling 'accountsChanged' event with payload", accounts);
      connect();
    };

    if (web3Provider !== undefined && web3Provider !== null) {
      web3Provider.on("accountsChanged", handleAccountsChanged);

      return () => {
        web3Provider.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [web3Modal, web3Provider, connect]);

  return (
    <Web3ProviderContext.Provider
      value={
        {
          connect,
          logout,
          web3,
          web3Modal,
          status,
        } as Web3ProviderValue
      }
    ></Web3ProviderContext.Provider>
  );
}

const useWeb3Provider = (): Web3ProviderValue =>
  useContext(Web3ProviderContext);

export { Web3Provider, Web3ProviderContext, useWeb3Provider };
export default Web3Provider;
