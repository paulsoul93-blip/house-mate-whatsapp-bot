export type IsoDate = `${number}-${number}-${number}`;

export interface DutyPeriod {
  person: string;
  startDate: IsoDate;
  endDate: IsoDate;
  formattedRange: string;
}

export interface DutySchedule {
  current: DutyPeriod;
  next: DutyPeriod;
}

export type BinKind = 'recycling' | 'residual' | 'food';

export interface CouncilCollection {
  collectionDate: IsoDate;
  bins: BinKind[];
}

export interface NextCouncilCollection extends CouncilCollection {
  putOutDate: IsoDate;
}

export type CouncilDataSource = 'live' | 'cache' | 'unavailable';

export interface CouncilCollectionStatus {
  collection: NextCouncilCollection | null;
  checkedAt: string;
  source: CouncilDataSource;
  sourceUrl: string;
}

export interface WelcomeCardData {
  address: string;
  postcode: string;
}

export interface CleaningCardData extends WelcomeCardData {
  schedule: DutySchedule;
  collectionStatus: CouncilCollectionStatus;
}

export interface BinsCardData extends WelcomeCardData {
  collectionStatus: CouncilCollectionStatus;
  binPhotoPath: string;
}
