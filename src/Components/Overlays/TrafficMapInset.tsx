
import {
    CompiledMapSystem,
    DisplayComponent,
    EventBus,
    FlightPlanner,
    FSComponent,
    HEvent,
    InstrumentEvents,
    MapIndexedRangeModule,
    MapSystemBuilder,
    NodeReference,
    Vec2Math,
    Vec2Subject,
    VecNMath,
    VNode
} from '@microsoft/msfs-sdk';

import {
    GarminMapKeys,
    TrafficAdvisorySystem,
    TrafficMapRangeController,
    UnitsUserSettings
} from '@microsoft/msfs-garminsdk';

import {
    MapBuilder,
    MapUserSettings,
    MapWaypointIconImageCache,
    PfdMapLayoutSettingMode,
    PFDUserSettings,
    TrafficUserSettings
} from '@microsoft/msfs-wtg1000';

import './TrafficMapInset.css';

interface TrafficMapInsetProps {

    /** An instance of the event bus. */
    bus: EventBus;

    /** An instance of the flight planner. */
    flightPlanner: FlightPlanner;

    /** The G1000 traffic advisory system. */
    tas: TrafficAdvisorySystem;
}

/**
 * The PFD map inset overlay.
 */
export class TrafficMapInset extends DisplayComponent<TrafficMapInsetProps> {
    private static readonly UPDATE_FREQ = 30; // Hz
    private static readonly DATA_UPDATE_FREQ = 4; // Hz
// pixels

    private readonly el = new NodeReference<HTMLDivElement>();

    private readonly mapSize = Vec2Subject.create(Vec2Math.create(242, 230));

    private readonly mapSettingManager = MapUserSettings.getPfdManager(this.props.bus);

    private readonly compiledTfcMap = MapSystemBuilder.create(this.props.bus)
        .with(MapBuilder.trafficMap, {
            trafficSystem: this.props.tas,

            dataUpdateFreq: TrafficMapInset.DATA_UPDATE_FREQ,

            rangeEndpoints: VecNMath.create(4, 0.5, 0.5, 0.5, 0.95),

            waypointIconImageCache: MapWaypointIconImageCache.getCache(),
            waypointStyleFontType: 'Roboto',

            trafficIconOptions: {
                iconSize: 30,
                font: 'Roboto-Bold',
                fontSize: 16
            },

            rangeRingOptions: {
                innerMinorTickSize: 0
            },

            flightPlanner: this.props.flightPlanner,
            ...MapBuilder.ownAirplaneIconOptions(false),
            miniCompassImgSrc: MapBuilder.miniCompassIconSrc(),

            mapRangeSettingManager: this.mapSettingManager as any,
            unitsSettingManager: UnitsUserSettings.getManager(this.props.bus),
            trafficSettingManager: TrafficUserSettings.getManager(this.props.bus) as any
        })
        .withProjectedSize(this.mapSize)
        .withClockUpdate(TrafficMapInset.UPDATE_FREQ)
        .build('pfd-trafficmap') as CompiledMapSystem<
        {
            /** The range module. */
            [GarminMapKeys.Range]: MapIndexedRangeModule;
        },
        any,
        {
            /** The range controller. */
            [GarminMapKeys.TrafficRange]: TrafficMapRangeController;
        },
        any
    >;
    private readonly mapRangeController = this.compiledTfcMap.context.getController(GarminMapKeys.TrafficRange);


    private isMfdPowered = false;

    /**
     * A callback called after the component renders.
     */
    public onAfterRender(): void {
        this.setVisible(false);

        PFDUserSettings.getManager(this.props.bus).whenSettingChanged('mapLayout').handle((mode) => {
            this.setVisible(mode === PfdMapLayoutSettingMode.TFC);
        });

        const hEvents = this.props.bus.getSubscriber<HEvent>();
        hEvents.on('hEvent').handle(this.onInteractionEvent.bind(this));

        this.props.bus.on('mfd_power_on', isPowered => this.isMfdPowered = isPowered);
        this.props.bus.getSubscriber<InstrumentEvents>().on('vc_screen_state').handle(state => {
            if (state.current === ScreenState.REVERSIONARY) {
                setTimeout(() => {
                    this.el.instance.classList.add('reversionary');
                    this.mapSize.set(312, 230);

                    if (!this.isMfdPowered) {
                        this.props.bus.on('mfd_power_on', this.onMfdPowerOn);
                    }
                }, 1000);
            } else if (this.isMfdPowered) {
                setTimeout(() => {
                    this.el.instance.classList.remove('reversionary');
                    this.mapSize.set(242, 230);
                }, 1000);
            }
        });
    }

    /**
     * Sets whether or not the inset map is visible.
     * @param isVisible Whether or not the map is visible.
     */
    public setVisible(isVisible: boolean): void {
        if (isVisible) {
            this.el.instance.style.display = '';
            this.compiledTfcMap.ref.instance.wake();
        } else {
            this.el.instance.style.display = 'none';
            this.compiledTfcMap.ref.instance.sleep();
        }
    }

    /**
     * Handles when the MFD has powered on.
     * @param isPowered Whether the MFD has finished powering up or not.
     */
    private onMfdPowerOn = (isPowered: boolean): void => {
        if (isPowered) {
            setTimeout(() => {
                this.el.instance.classList.remove('reversionary');
                this.mapSize.set(242, 230);

                // noinspection JSDeprecatedSymbols
                this.props.bus.off('mfd_power_on', this.onMfdPowerOn);
            }, 1000);
        }
    };

    /**
     * A callback which is called when an interaction event occurs.
     * @param hEvent An interaction event.
     */
    private onInteractionEvent(hEvent: string): void {
        if (!this.compiledTfcMap.ref.instance.isAwake) {
            return;
        }

        switch (hEvent) {
            case 'AS1000_PFD_RANGE_INC':
                this.changeMapRangeIndex(1);
                break;
            case 'AS1000_PFD_RANGE_DEC':
                this.changeMapRangeIndex(-1);
                break;
        }
    }

    /**
     * Changes the MFD map range index setting.
     * @param delta The change in index to apply.
     */
    private changeMapRangeIndex(delta: 1 | -1): void {
        this.mapRangeController.changeRangeIndex(delta);
    }

    /**
     * Renders the component.
     * @returns The component VNode.
     */
    public render(): VNode {
        return (
            <div class="map-inset" ref={this.el}>
                {this.compiledTfcMap.map}
            </div>
        );
    }
}
