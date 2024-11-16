import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsPhoneNumber(null, { message: 'Некорректный номер телефона' })
  phoneNumber: string;
}
