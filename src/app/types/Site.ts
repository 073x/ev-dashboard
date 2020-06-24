import { Address } from './Address';
import { Company } from './Company';
import CreatedUpdatedProps from './CreatedUpdatedProps';
import { SiteArea } from './SiteArea';
import { Data } from './Table';
import { User } from './User';

export interface Site extends Data, CreatedUpdatedProps {
  id: string;
  name: string;
  companyID: string;
  company: Company;
  autoUserSiteAssignment: boolean;
  siteAreas: SiteArea[];
  address: Address;
  image: string;
  images: object[];
  gps: string;
  consumptionData: object;
  occupationData: object;
  userIDs: string[];
  users: User[];
}

export interface SiteUser extends Data {
  site: Site;
  userID: string;
  siteAdmin: boolean;
  siteOwner: boolean;
}

export enum SiteButtonAction {
  VIEW_SITE = 'view_site',
  EDIT_SITE = 'edit_site',
  CREATE_SITE = 'create_site',
  DELETE_SITE = 'delete_site',
  ASSIGN_USERS_TO_SITE = 'assign_users_to_site'
}

export enum SiteImage {
  NO_IMAGE = 'assets/img/theme/no-logo.png',
}
