import {
    G1000AvionicsPlugin,
    G1000PfdPluginBinder,
    PfdMapLayoutSettingMode,
    PFDUserSettings
} from "@microsoft/msfs-wtg1000";
import {
    DisplayComponent,
    DisplayComponentFactory,
    FSComponent,
    registerPlugin,
    TrafficInstrument,
    VNode
} from "@microsoft/msfs-sdk";
import {
    GarminAdsb,
    TrafficAdvisorySystem
} from "@microsoft/msfs-garminsdk";
import {MapInset} from "./Components/Overlays/MapInset";
import {TrafficMapInset} from "./Components/Overlays/TrafficMapInset";

export class PFDTrafficMapPlugin extends G1000AvionicsPlugin<G1000PfdPluginBinder> {
    private readonly trafficInstrument: TrafficInstrument = new TrafficInstrument(this.binder.bus, {
        realTimeUpdateFreq: 2,
        simTimeUpdateFreq: 1,
        contactDeprecateTime: 10
    });
    private readonly tas = new TrafficAdvisorySystem(this.binder.bus, this.trafficInstrument, new GarminAdsb(this.binder.bus), false);

    public onInstalled(): void {
        this.loadCss('coui://html_ui/Mods/PFDTrafficMap.css').then(() => {
            console.log("CSS loaded");
        });
        this.tas.init();
    }

    public onMenuSystemInitialized(): void {
        let pfdRootMenu = this.binder.menuSystem.getMenu('root');
        pfdRootMenu.removeItem(2);
        pfdRootMenu.addItem(2, 'TFC Map', () => {
            this.togglePfdTrafficMap()
        });

        let mapHsiLayoutMenu = this.binder.menuSystem.getMenu('map-hsi-layout');
        mapHsiLayoutMenu.removeItem(3);
        mapHsiLayoutMenu.addItem(3, 'TFC Map', () => {
            this.onTfcMapPressed()
        });
    }

    public onComponentCreating = (constructor: DisplayComponentFactory<any>, props: any): DisplayComponent<any> | undefined => {
        if (constructor.name === 'MapInset') {
            return new MapInset({
                bus: this.binder.bus,
                flightPlanner: this.binder.fms.flightPlanner,
                tas: this.tas
            });
        }
        return undefined;
    };

    public renderToPfdInstruments(): VNode {
        return <TrafficMapInset bus={this.binder.bus} flightPlanner={this.binder.fms.flightPlanner} tas={this.tas} />;
    }

    private togglePfdTrafficMap() {
       if (PFDUserSettings.getManager(this.binder.menuSystem.bus).getSetting('mapLayout').value === PfdMapLayoutSettingMode.TFC) {
           PFDUserSettings.getManager(this.binder.menuSystem.bus).getSetting('mapLayout').value = PfdMapLayoutSettingMode.Off;
       } else {
           PFDUserSettings.getManager(this.binder.menuSystem.bus).getSetting('mapLayout').value = PfdMapLayoutSettingMode.TFC;
       }
    }

    private onTfcMapPressed() {
        PFDUserSettings.getManager(this.binder.menuSystem.bus).getSetting('mapLayout').value = PfdMapLayoutSettingMode.TFC;
    }
}

registerPlugin(PFDTrafficMapPlugin);
