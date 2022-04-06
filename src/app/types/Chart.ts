export enum ConsumptionChartDatasetOrder {
  INSTANT_WATTS = 0,
  INSTANT_WATTS_L1 = 1,
  INSTANT_WATTS_L2 = 2,
  INSTANT_WATTS_L3 = 3,
  INSTANT_AMPS = 4,
  INSTANT_AMPS_L1 = 5,
  INSTANT_AMPS_L2 = 6,
  INSTANT_AMPS_L3 = 7,
  INSTANT_AMPS_DC = 8,
  CUMULATED_CONSUMPTION_WH = 9,
  CUMULATED_CONSUMPTION_AMPS = 10,
  LIMIT_WATTS = 11,
  LIMIT_AMPS = 12,
  STATE_OF_CHARGE = 13,
  INSTANT_VOLTS = 14,
  INSTANT_VOLTS_DC = 15,
  INSTANT_VOLTS_L1 = 16,
  INSTANT_VOLTS_L2 = 17,
  INSTANT_VOLTS_L3 = 18,
  AMOUNT = 19,
  CUMULATED_AMOUNT = 20,
  ASSET_CONSUMPTION_WATTS = 21,
  ASSET_PRODUCTION_WATTS = 22,
  CHARGING_STATION_CONSUMPTION_WATTS = 23,
  NET_CONSUMPTION_WATTS = 24,
  ASSET_CONSUMPTION_AMPS = 25,
  ASSET_PRODUCTION_AMPS = 26,
  CHARGING_STATION_CONSUMPTION_AMPS = 27,
  NET_CONSUMPTION_AMPS = 28,
  PLAN_WATTS = 29,
  PLAN_AMPS = 30,
};

export enum ChartTypes {
  PIE = 'pie',
  BAR = 'bar',
  STACKED_BAR = 'stackedBar',
  LINE = 'line',
};

export enum ChartAxisNames {
  X = 'x',
  AMPERAGE = 'Amperage',
  POWER = 'Power',
  PERCENTAGE = 'Percentage',
  VOLTAGE = 'Voltage',
  AMOUNT = 'Amount',
}

export interface ChartAxes {
  order: number,
  key: ChartAxisNames,
  value: any
}

export interface ChartDatum {
  key: any,
  axes: ChartAxes,
  visible: boolean,
  color: string,
}

export interface Chart {
  type: ChartTypes,
  data: any,
  datasets: ChartDatum[],
  axes: ChartAxes[]
}

export enum ChartColor {
  PRIMARY = '',
  PRIMARY_2 = '',
  PRIMARY_3 = '',
  ACCENT = '',
  DANGER = '',
  SUCCESS = '',
  WARNING = '',
  CYAN = '',
  PURPLE = '',
  PURPLE_1 = '',
  PURPLE_2 = '',
  PURPLE_3 = '',
  YELLOW = ''
}
