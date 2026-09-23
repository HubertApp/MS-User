//Tableau de favoris contenant un départ et une arrivée, avec départ/arrivée étant un tableau latitudide/longitude. Le tableau de favoris est trié par ordre chronologique d'ajout.

import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsLatitude, IsLongitude, IsString, MaxLength } from 'class-validator';

@InputType()
export class FavouriteUserInput {

    @Field(() => String)
    @IsString()
    @MaxLength(64)
    userId?: string;

    @Field(() => String)
    @IsString()
    @MaxLength(100)
    title?: string;

    @Field(() => [Number])
    @IsArray()
    @IsLatitude({ each: true })
    @IsLongitude({ each: true })
    coordinatesDeparture?: [number, number];

    @Field(() => [Number])
    @IsArray()
    @IsLatitude({ each: true })
    @IsLongitude({ each: true })
    coordinatesArrival?: [number, number];


}
