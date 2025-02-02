import LocalCommunicator from 'common/communicator/LocalCommunicator';
import { Adaptor, Channel /*, ParameterType, get_method */ } from '@vgerbot/channel';

describe('channel adaptor', () => {
    let localCommunicator: LocalCommunicator;
    let downlineCommunicator: LocalCommunicator;
    let uplineCommunicator: LocalCommunicator;
    let remoteCommunicator: LocalCommunicator;
    let localChannel: Channel;
    let remoteChannel: Channel;
    let adaptor: Adaptor;
    beforeEach(() => {
        localCommunicator = new LocalCommunicator();
        downlineCommunicator = localCommunicator.createRemote();
        uplineCommunicator = new LocalCommunicator();
        remoteCommunicator = uplineCommunicator.createRemote();
        Object.assign(localCommunicator, {
            name: 'local communicator'
        });
        Object.assign(downlineCommunicator, {
            name: 'downline communicator'
        });
        Object.assign(uplineCommunicator, {
            name: 'upline communicator'
        });
        Object.assign(remoteCommunicator, {
            name: 'remote communicator'
        });
        localChannel = new Channel('local', localCommunicator);
        remoteChannel = new Channel('local', remoteCommunicator);
        Object.assign(localChannel, {
            name: 'local channel'
        });
        Object.assign(remoteChannel, {
            name: 'remote channel'
        });
        adaptor = new Adaptor(downlineCommunicator, uplineCommunicator, 'local');
    });
    afterEach(() => {
        localChannel.destroy();
        remoteChannel.destroy();
        adaptor.close();
    });

    it('Should work correctly to pass remote objects', async () => {
        class A {}
        class B {
            method(a: A) {
                console.info(a);
                return a instanceof A;
            }
        }
        remoteChannel.def_class('A', A);
        remoteChannel.def_class('B', B);

        // class BDef {
        //     @get_method({
        //         paramTypes: [ParameterType.remoteObject]
        //     })
        //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
        //     method(_: A): boolean {
        //         throw new Error('Method not implemented');
        //     }
        // }

        const RemoteA = localChannel.get_class<A>('A');
        const RemoteB = localChannel.get_class<B>('B');

        const remoteA = new RemoteA();
        const remoteB = new RemoteB();

        await expect(remoteB.method(remoteA)).to.become(true);
    });
});
